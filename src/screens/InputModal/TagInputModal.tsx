import { ButtonCell } from '@Components/ButtonCell';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { TableSection } from '@Components/TableSection';
import { ModalStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_INPUT_MODAL_TAG } from '@Root/screens2/screens';
import { StyleKitContext } from '@Style/StyleKit';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { TextInput } from 'react-native';
import { SNTag } from 'snjs';
import { TagMutator } from 'snjs/dist/@types/models/app/tag';
import { Container, Input } from './InputModal.styled';

type Props = ModalStackNavigationProp<typeof SCREEN_INPUT_MODAL_TAG>;
export const TagInputModal = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const styleKit = useContext(StyleKitContext);

  // State
  const [text, setText] = useState('');

  // Refs
  const textRef = useRef<TextInput>(null);

  useEffect(() => {
    if (props.route.params.tagUuid) {
      const tag = application?.findItem(props.route.params.tagUuid) as SNTag;
      setText(tag.title);
    }
  }, [application, props.route.params.tagUuid]);

  const onSubmit = useCallback(async () => {
    if (props.route.params.tagUuid) {
      const tag = application?.findItem(props.route.params.tagUuid) as SNTag;
      await application?.changeItem(tag.uuid, mutator => {
        const tagMutator = mutator as TagMutator;
        tagMutator.title = text;
        if (props.route.params.noteUuid) {
          const note = application.findItem(props.route.params.noteUuid);
          if (note) {
            tagMutator.addItemAsRelationship(note);
          }
        }
      });
    } else {
      const tag = await application!.findOrCreateTag(text);
      if (props.route.params.noteUuid) {
        await application?.changeItem(tag.uuid, mutator => {
          const tagMutator = mutator as TagMutator;
          const note = application.findItem(props.route.params.noteUuid!);
          if (note) {
            tagMutator.addItemAsRelationship(note);
          }
        });
      }
    }

    application?.sync();
    props.navigation.goBack();
  }, [
    application,
    props.navigation,
    props.route.params.noteUuid,
    props.route.params.tagUuid,
    text,
  ]);

  return (
    <Container>
      <TableSection>
        <SectionedTableCell textInputCell first={true}>
          <Input
            ref={textRef}
            placeholder={
              props.route.params.tagUuid ? 'Tag name' : 'New tag name'
            }
            onChangeText={setText}
            value={text}
            autoCorrect={false}
            autoCapitalize={'none'}
            keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
            autoFocus
            underlineColorAndroid={'transparent'}
            onSubmitEditing={onSubmit}
          />
        </SectionedTableCell>

        <ButtonCell
          maxHeight={45}
          disabled={text.length === 0}
          title={'Save'}
          bold
          onPress={onSubmit}
        />
      </TableSection>
    </Container>
  );
};
