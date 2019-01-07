import React, { Component } from 'react';
import StyleKit from "@Style/StyleKit"
import ApplicationState from "@Lib/ApplicationState"
import {TextInput, View, Text, Platform, Share, Linking} from 'react-native';

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";

export default class CompanySection extends Component {

  onAction = (action) => {
    if(action == "feedback") {
      var platformString = Platform.OS == "android" ? "Android" : "iOS";
      Linking.openURL(`mailto:hello@standardnotes.org?subject=${platformString} app feedback (v${ApplicationState.version})`);
    } else if(action == "learn_more") {
      Linking.openURL("https://standardnotes.org");
    } else if(action == "privacy") {
      Linking.openURL("https://standardnotes.org/privacy");
    } else if(action == "help") {
      Linking.openURL("https://standardnotes.org/help");
    } else if(action == "rate") {
      if(ApplicationState.isIOS) {
        Linking.openURL("https://itunes.apple.com/us/app/standard-notes/id1285392450?ls=1&mt=8");
      } else {
        Linking.openURL("market://details?id=com.standardnotes");
      }
    } else if(action == "friend") {
      let title = "Standard Notes";
      var message = "Check out Standard Notes, a free, open-source, and completely encrypted notes app.";
      let url = "https://standardnotes.org";
      // Android ignores url. iOS ignores title.
      if(ApplicationState.isAndroid) {
        message += "\n\nhttps://standardnotes.org";
      }

      ApplicationState.get().performActionWithoutStateChangeImpact(() => {
        Share.share({title: title, message: message, url: url})
      })
    }
  }

  render() {
    let storeName = Platform.OS == 'android' ? "Play Store" : "App Store";
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        <ButtonCell first={true} leftAligned={true} title="Help" onPress={() => this.onAction("help")} />

        <ButtonCell leftAligned={true} title="Send Feedback" onPress={() => this.onAction("feedback")} />

        <ButtonCell leftAligned={true} title="Tell a Friend" onPress={() => this.onAction("friend")} />

        <ButtonCell leftAligned={true} title="Learn more about Standard Notes" onPress={() => this.onAction("learn_more")} />

        <ButtonCell leftAligned={true} title="Our Privacy Manifesto" onPress={() => this.onAction("privacy")} />

        <ButtonCell last={true} leftAligned={true} title="Rate Standard Notes" onPress={() => this.onAction("rate")} >
          <View style={{display: "flex", flexDirection: "column"}}>
            <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>Version {ApplicationState.version}</Text>
            <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>Help support us with a review on the {storeName}.</Text>
          </View>
        </ButtonCell>

      </TableSection>
    );
  }
}
