import Block from './Block'
import Document from './Document'
import { TextAttributesMap } from '@delta/attributes'
import { boundMethod } from 'autobind-decorator'
import { Selection } from '@delta/Selection'
import TextTransformsRegistry from '@core/TextTransformsRegistry'
import { DeltaChangeContext } from '@delta/DeltaChangeContext'
import mergeLeft from 'ramda/es/mergeLeft'

export default class TextBlock<T extends string> extends Block<T> {

  private cursorTextAttributes: TextAttributesMap<T> = {}
  private length: number = 0

  constructor(blockInterface: Document.BlockInterface<T>) {
    super(blockInterface)
  }

  private updateLineType(selection: Selection): void {
    const lineType = this.getDelta().getLineTypeInSelection(selection)
    this.blockInterface.bridgeInnerInterface.setSelectedLineType(lineType)
  }

  private updateTextAttributes(selection: Selection): void {
    const textAttributes = this.getDelta().getSelectedTextAttributes(selection)
    this.blockInterface.bridgeInnerInterface.setSelectedTextAttributes(textAttributes)
  }

  handleOnSelectionChange(selection: Selection): void {
    this.selection = selection
    this.updateTextAttributes(selection)
    this.updateLineType(selection)
  }

  getLength(): number {
    return this.length
  }

  setCursorAttributes(cursorTextAttributes: TextAttributesMap<T>): TextAttributesMap<T> {
    this.cursorTextAttributes = mergeLeft(cursorTextAttributes, this.cursorTextAttributes)
    return this.cursorTextAttributes
  }

  getCursorAttributes(): TextAttributesMap<T> {
    return this.cursorTextAttributes
  }

  getTextTransformsRegistry(): TextTransformsRegistry<T> {
    return this.blockInterface.bridgeInnerInterface.getTextTransformsReg()
  }

  @boundMethod
  handleOnTextChange(newText: string, deltaChangeContext: DeltaChangeContext): void {
    const documentDeltaUpdate = this.getDelta().applyTextDiff(newText, deltaChangeContext, this.cursorTextAttributes)
    this.updateDelta(documentDeltaUpdate)
    this.length = newText.length
    this.updateTextAttributes(deltaChangeContext.selectionAfterChange)
    const lineType = documentDeltaUpdate.getLineTypeInSelection(deltaChangeContext.selectionAfterChange)
    this.blockInterface.bridgeInnerInterface.setSelectedLineType(lineType)
  }
}
