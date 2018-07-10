import React, { Component } from 'react';
import App from '../app'
import Sync from '../lib/sfjs/syncManager'
import ModelManager from '../lib/sfjs/modelManager'
import Auth from '../lib/sfjs/authManager'

import Abstract from "./Abstract"
import ComponentManager from '../lib/componentManager'
import Icons from '../Icons';
import LockedView from "../containers/LockedView";
import Icon from 'react-native-vector-icons/Ionicons';

import TextView from "sn-textview";

import {
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Text
} from 'react-native';

import GlobalStyles from "../Styles"

export default class Compose extends Abstract {

  static navigatorStyle = {
    tabBarHidden: true
  };

  constructor(props) {
    super(props);
    var note = ModelManager.get().findItem(props.noteId);
    if(!note) {
      note = ModelManager.get().createItem({content_type: "Note", dummy: true, text: ""});
      // We needed to add the item originally for default editors to work, but default editors was removed
      // So the only way to select an editor is to make a change to the note, which will add it.
      // The problem with adding it here is that if you open Compose and close it without making changes, it will save an empty note.
      // ModelManager.get().addItem(note);
      note.dummy = true;
    }

    this.note = note;
    this.constructState({title: note.title, text: note.text});

    this.loadStyles();

    this.syncObserver = Sync.get().addEventHandler((event, data) => {
      if(event == "sync:completed") {
        if(data.retrievedItems && this.note.uuid && data.retrievedItems.map((i) => i.uuid).includes(this.note.uuid)) {
          this.refreshContent();
        }
      }
    })

    this.configureNavBar(true);
  }

  refreshContent() {
    this.mergeState({title: this.note.title, text: this.note.text});
  }

  loadEditor() {
    var noteEditor = ComponentManager.get().editorForNote(this.note);

    if(noteEditor) {
      let presentEditor = () => {
        this.presentedEditor = true;
        this.props.navigator.showModal({
          screen: 'sn.Webview',
          title: noteEditor.name,
          animationType: 'slide-up',
          passProps: {
            noteId: this.note.uuid,
            editorId: noteEditor.uuid
          }
        });
      }
      if(!this.note.uuid) {
        this.note.initUUID().then(() => {
          presentEditor();
        })
      } else {
        presentEditor();
      }
    }
  }

  componentDidMount() {
    super.componentDidMount();

    setTimeout(() => {
      this.loadEditor();
    }, 150 /* This is an aesthetic delay and not functional. It doesn't look too good when it comes up so fast. */);
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Sync.get().removeEventHandler(this.syncObserver);
  }

  viewDidAppear() {
    super.viewDidAppear();

    // Autofocus doesn't work properly on iOS due to navigation push, so we'll focus manually
    if(App.isIOS) {
      if(this.note.dummy) {
        this.input.focus();
      }
    }
  }

  // on iOS, declaring nav bar buttons as static prevents the flickering issue that occurs on nav push

  static navigatorButtons = Platform.OS == 'android' ? {} : {
    rightButtons: [{
      title: "Manage",
      id: 'tags',
      showAsAction: 'ifRoom',
    }]
  };

  configureNavBar(initial) {
    super.configureNavBar();

    // Only edit the nav bar once, it wont be changed
    if(!initial) {
      return;
    }

    var tagButton = {
      title: "Manage",
      id: 'tags',
      showAsAction: 'ifRoom',
    }

    if(Platform.OS === "android") {
      tagButton.icon = Icons.getIcon("md-pricetag");
    }

    if(!this.note.uuid) {
      if(App.isIOS) {
        tagButton.disabled = true;
      } else {
        tagButton = {};
      }
    }

    this.props.navigator.setButtons({
      rightButtons: [tagButton],
      animated: false
    });
  }

  onNavigatorEvent(event) {
    super.onNavigatorEvent(event);

    if(event.id == 'didAppear') {
      if(this.note.dummy) {
        if(this.refs.input) {
          this.refs.input.focus();
        }
      }
    } else if(event.id == "willAppear") {
      // Changes made in an external editor are not reflected automatically
      if(this.presentedEditor) {
        this.presentedEditor = false;
        this.refreshContent();
      }

      if(this.note.dirty) {
        // We want the "Saving..." / "All changes saved..." subtitle to be visible to the user, so we delay
        setTimeout(() => {
          this.changesMade();
        }, 300);
      }
    }
    if (event.type == 'NavBarButtonPress') {
      if (event.id == 'tags') {
        this.showOptions();
      }
    }
  }

  showOptions() {
    if(App.isAndroid) {
      this.input.blur();
    }

    this.previousOptions = {selectedTags: this.note.tags.map(function(tag){return tag.uuid})};
    this.props.navigator.push({
      screen: 'sn.Filter',
      title: 'Options',
      animationType: 'slide-up',
      passProps: {
        noteId: this.note.uuid,
        onManageNoteEvent: () => {this.forceUpdate()},
        singleSelectMode: false,
        options: JSON.stringify(this.previousOptions),
        onEditorSelect: () => {this.presentedEditor = true},
        onOptionsChange: (options) => {
          if(!_.isEqual(options.selectedTags, this.previousOptions.selectedTags)) {
            var tags = ModelManager.get().findItems(options.selectedTags);
            this.replaceTagsForNote(tags);
            this.note.setDirty(true);
            this.changesMade();
          }
        }
      }
    });
  }

  replaceTagsForNote(newTags) {
    let note = this.note;

    var oldTags = note.tags.slice(); // original array will be modified in the for loop so we make a copy
    for(var oldTag of oldTags) {
      if(!newTags.includes(oldTag)) {
        oldTag.removeItemAsRelationship(note);
        oldTag.setDirty(true);
        // Notes don't have tags as relationships anymore, but we'll keep this to clean up old notes.
        note.removeItemAsRelationship(oldTag);
      }
    }

    for(var newTag of newTags) {
      newTag.setDirty(true);
      newTag.addItemAsRelationship(note);
    }

    note.tags = newTags;
  }

  onTitleChange = (text) => {
    this.mergeState({title: text})
    this.note.title = text;
    this.changesMade();
  }

  onTextChange = (text) => {
    this.note.text = text;
    this.changesMade();
  }

  changesMade() {
    this.note.hasChanges = true;

    if(this.saveTimeout) clearTimeout(this.saveTimeout);
    if(this.statusTimeout) clearTimeout(this.statusTimeout);
    this.saveTimeout = setTimeout(() => {
      this.setNavBarSubtitle("Saving...");
      if(!this.note.uuid) {
        this.note.initUUID().then(() => {
          if(this.props.selectedTagId) {
            var tag = ModelManager.get().findItem(this.props.selectedTagId);
            tag.addItemAsRelationship(this.note);
          }
          this.save();
          this.configureNavBar(true);
        });
      } else {
        this.save();
      }
    }, 275)
  }

  sync(note, callback) {
    note.setDirty(true);

    Sync.get().sync().then((response) => {
      if(response && response.error) {
        if(!this.didShowErrorAlert) {
          this.didShowErrorAlert = true;
          // alert("There was an error saving your note. Please try again.");
        }
        if(callback) {
          callback(false);
        }
      } else {
        note.hasChanges = false;
        if(callback) {
          callback(true);
        }
      }
    })
  }

  save() {
    var note = this.note;
    if(note.dummy) {
      note.dummy = false;
      ModelManager.get().addItem(note);
    }
    this.sync(note, function(success){
      if(success) {
        if(this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(function(){
          var status = "All changes saved"
          if(Auth.get().offline()) {
            status += " (offline)";
          }
          this.saveError = false;
          this.syncTakingTooLong = false;
          this.noteStatus = this.setNavBarSubtitle(status);
        }.bind(this), 200)
      } else {
        if(this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(function(){
          this.saveError = true;
          this.syncTakingTooLong = false;
          this.setNavBarSubtitle("Error syncing (changes saved offline)");
        }.bind(this), 200)
      }
    }.bind(this));
  }

  render() {
    if(this.state.lockContent) {
      return (<LockedView />);
    }

    /*
      For the note text, we are using a custom component that is currently incapable of immediate re-renders on text
      change without flickering. So we do not use this.state.text for the value, but instead this.note.text.
      For the title however, we are not using a custom component and thus can (and must) look at the state value of
      this.state.title for the value. We also update the state onTitleChange.
    */

    return (
      <View style={[this.styles.container, GlobalStyles.styles().container]}>

        {this.note.locked &&
          <View style={this.styles.lockedContainer}>
            <Icon name={Icons.nameForIcon("lock")} size={20} color={GlobalStyles.constants().mainBackgroundColor} />
            <Text style={this.styles.lockedText}>Note Locked</Text>
          </View>
        }

        <TextInput
          style={this.styles.noteTitle}
          onChangeText={this.onTitleChange}
          value={this.state.title}
          placeholder={"Add Title"}
          selectionColor={GlobalStyles.constants().mainTintColor}
          underlineColorAndroid={'transparent'}
          placeholderTextColor={GlobalStyles.constants().mainDimColor}
          autoCorrect={true}
          autoCapitalize={'sentences'}
          editable={!this.note.locked}
        />

        {Platform.OS == "android" &&
          <View style={this.styles.noteTextContainer}>
            <TextView style={[GlobalStyles.stylesForKey("noteText")]}
              ref={(ref) => this.input = ref}
              autoFocus={this.note.dummy}
              value={this.note.text}
              selectionColor={GlobalStyles.lighten(GlobalStyles.constants().mainTintColor, 0.35)}
              handlesColor={GlobalStyles.constants().mainTintColor}
              onChangeText={this.onTextChange}
              editable={!this.note.locked}
            />
          </View>
        }

        {Platform.OS == "ios" &&
          <TextView style={[...GlobalStyles.stylesForKey("noteText"), {paddingBottom: 10}]}
            ref={(ref) => this.input = ref}
            autoFocus={false}
            value={this.note.text}
            keyboardDismissMode={'interactive'}
            selectionColor={GlobalStyles.lighten(GlobalStyles.constants().mainTintColor)}
            onChangeText={this.onTextChange}
            editable={!this.note.locked}
          />
        }
      </View>
    );
  }

  loadStyles() {
    this.rawStyles = {
      container: {
        flex: 1,
        flexDirection: 'column',
        height: "100%",
      },

      noteTitle: {
        fontWeight: "600",
        fontSize: 16,
        color: GlobalStyles.constants().mainTextColor,
        height: 50,
        borderBottomColor: GlobalStyles.constants().composeBorderColor,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === "ios" ? 5 : 12,
        paddingLeft: GlobalStyles.constants().paddingLeft,
        paddingRight: GlobalStyles.constants().paddingLeft,
      },

      lockedContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        flexDirection: 'row',
        alignItems: "center",
        height: 30,
        maxHeight: 30,
        paddingLeft: GlobalStyles.constants().paddingLeft,
        backgroundColor: GlobalStyles.constants().mainTintColor,
        borderBottomColor: GlobalStyles.constants().plainCellBorderColor,
        borderBottomWidth: 1
      },

      lockedText: {
        fontWeight: "bold",
        color: GlobalStyles.constants().mainBackgroundColor,
        paddingLeft: 10
      },

      textContainer: {
        flexGrow: 1,
        flex: 1,
      },

      contentContainer: {
        flexGrow: 1,
      },

      noteTextContainer: {
        flexGrow: 1,
        flex: 1,
      },
    }

    this.styles = StyleSheet.create(this.rawStyles);

  }
}
