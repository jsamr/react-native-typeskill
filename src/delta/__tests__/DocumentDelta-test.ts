// tslint:disable: no-string-literal
import { TextAttributesMap } from '@delta/attributes'
import { Selection } from '@delta/Selection'
import { mockDeltaChangeContext, mockSelection } from '@test/delta'
import { GenericDelta } from '@delta/generic'
import { getHeadingCharactersFromType, isLineInSelection, TextLineType } from '@delta/lines'
import { mockDocumentDelta } from '@test/document'
import { LineWalker } from '@delta/LineWalker'

describe('@delta/DocumentDelta', () => {
  // The idea is to expose operations on different kind of blocks
  // Giving support for text blocks, ordered and unordered lists, headings
  describe('eachLine', () => {
    it('should handle lines', () => {
      const textDelta = mockDocumentDelta([
        { insert: 'eheh' },
        { insert: '\n', attributes: { $type: 'misc' } },
        { insert: 'ahah' },
        { insert: '\n', attributes: { $type: 'rand' } },
        { insert: 'ohoh\n\n' }
      ])
      const lines: GenericDelta[] = []
      const attributes: TextAttributesMap<any>[] = []
      textDelta['delta'].eachLine((l, a) => {
        attributes.push(a)
        lines.push(l)
      })
      expect(lines).toEqual([
        { ops: [{ insert: 'eheh' }] },
        { ops: [{ insert: 'ahah' }] },
        { ops: [{ insert: 'ohoh' }] },
        { ops: [] }
      ])
      expect(attributes).toEqual([
        { $type: 'misc' },
        { $type: 'rand' },
        {},
        {}
      ])
    })
  })
  describe('applyTextDiff', () => {
    it('should reproduce a delete operation when one character was deleted', () => {
      const newText = 'Hello worl\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world\n' }
      ])
      const changeContext = mockDeltaChangeContext(11, 10)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: newText }
      ])
    })
    it('should reproduce a delete operation when two or more characters were deleted', () => {
      const newText = 'Hello \n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world\n' }
      ])
      const changeContext = mockDeltaChangeContext(6, 6, 11)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: newText }
      ])
    })
    it('should reproduce a delete operation when multiple lines were deleted', () => {
      const newText = 'A\nB\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'A\nBC\nD\n' }
      ])
      const changeContext = mockDeltaChangeContext(3, 3, 7)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: 'A\nB\n' }
      ])
    })
    it('should reproduce an insert operation when one character was inserted', () => {
      const newText = 'Hello world\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello worl\n' }
      ])
      const changeContext = mockDeltaChangeContext(10, 11)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops[0].insert).toBe(newText)
    })
    it('should reproduce an insert operation when two or more characters were inserted', () => {
      const newText = 'Hello world\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello \n' }
      ])
      const changeContext = mockDeltaChangeContext(6, 11)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: newText }
      ])
    })
    it('should reproduce an insert operation when multiple lines were inserted', () => {
      const newText = 'Hello world\nFoo\nBar\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world\n' }
      ])
      const changeContext = mockDeltaChangeContext(11, 19)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: newText }
      ])
    })
    it('should reproduce a replace operation when one character was replaced', () => {
      const newText = 'Hello worlq\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world\n' }
      ])
      const changeContext = mockDeltaChangeContext(10, 11, 11)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: newText }
      ])
    })
    it('should reproduce a replace operation when two ore more characters were replaced', () => {
      const newText = 'Hello cat\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world\n' }
      ])
      const changeContext = mockDeltaChangeContext(6, 9, 11)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: newText }
      ])
    })
    it("should reproduce a replace operation when cursor didn't move, but the text was replaced on the same line as cursor", () => {
      // This would happen with keyboard suggestions
      const newText = 'Hello cat\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello pet\n' }
      ])
      const changeContext = mockDeltaChangeContext(9, 9)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: newText }
      ])
    })
    it('should reproduce a replace operation when cursor moved, but the change occurred out of cursor boundaries, in the same line', () => {
      // This would happen with keyboard suggestions
      const newText = 'Hello petty\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello cat\n' }
      ])
      const changeContext = mockDeltaChangeContext(9, 11)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: newText }
      ])
    })
    it('should keep the line type at selection start when reproducing a multiline replace operation', () => {
      const newText = 'A\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'A' },
        { insert: '\n', attributes: { $type: 'custom' } },
        { insert: 'B\nC\n' }
      ])
      const changeContext = mockDeltaChangeContext(1, 1, 5)
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: 'A' },
        { insert: '\n', attributes: { $type: 'custom' } }
      ])
    })
    it('should append a newline character to delta after inserting a character at the begening of a newline', () => {
      const newText = 'Hello world\nH'
      const changeContext = mockDeltaChangeContext(12, 13)
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world\n' }
      ])
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: 'Hello world\nH\n' }
      ])
    })
    it('should retain newline character after inserting a newline character to keep the current linetype, if that line type is not propagable', () => {
      const newText = 'Hello world\n'
      const changeContext = mockDeltaChangeContext(11, 12)
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world' },
        { insert: '\n', attributes: { $type: 'misc' } }
      ])
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: 'Hello world' },
        { insert: '\n', attributes: { $type: 'misc' } },
        { insert: '\n' }
      ])
    })
    it('it should handle insertion of a newline character from the middle of a line', () => {
      const newText = 'Hello \nworld\n'
      const changeContext = mockDeltaChangeContext(6, 7)
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world\n' }
      ])
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: 'Hello \nworld\n' }
      ])
    })
    it('should not propagate the previous line type to the newline after replacing a newline character, if that line type is not propagable', () => {
      const newText = 'Hello worl\n'
      const changeContext = mockDeltaChangeContext(10, 11, 11)
      const originalDelta = mockDocumentDelta([
        { insert: 'Hello world' },
        { insert: '\n', attributes: { $type: 'misc' } }
      ])
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: 'Hello worl' },
        { insert: '\n', attributes: { $type: 'misc' } },
        { insert: '\n' }
      ])
    })
    it('should propagate the previous line type to the newline after inserting a newline character and prepend the appropriate prefix, if that line type is propagable', () => {
      const head = getHeadingCharactersFromType('ul', 0)
      const newText = head + 'Hello world\n'
      const changeContext = mockDeltaChangeContext(head.length + 11, head.length + 12)
      const originalDelta = mockDocumentDelta([
        { insert: getHeadingCharactersFromType('ul', 0) + 'Hello world' },
        { insert: '\n', attributes: { $type: 'ul' } }
      ])
      const { finalDelta: normalizedDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(normalizedDelta.ops).toEqual([
        { insert: getHeadingCharactersFromType('ul', 0) + 'Hello world' },
        { insert: '\n', attributes: { $type: 'ul' } },
        { insert: getHeadingCharactersFromType('ul', 0) },
        { insert: '\n', attributes: { $type: 'ul' } }
      ])
    })
    it('should propagate the previous line type to the newline after inserting a newline character in the middle of a line and prepend the appropriate prefix, if that line type is propagable', () => {
      const head = getHeadingCharactersFromType('ul', 0)
      const newText = head + 'Hello \nworld\n'
      const changeContext = mockDeltaChangeContext(head.length + 6, head.length + 7)
      const originalDelta = mockDocumentDelta([
        { insert: getHeadingCharactersFromType('ul', 0) + 'Hello world' },
        { insert: '\n', attributes: { $type: 'ul' } }
      ])
      const { finalDelta: normalizedDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(normalizedDelta.ops).toEqual([
        { insert: getHeadingCharactersFromType('ul', 0) + 'Hello ' },
        { insert: '\n', attributes: { $type: 'ul' } },
        { insert: getHeadingCharactersFromType('ul', 1) + 'world' },
        { insert: '\n', attributes: { $type: 'ul' } }
      ])
    })
    it('should propagate the previous line type to the newline after replacing a newline character and prepend the appropriate prefix, if that line type is propagable', () => {
      const head = getHeadingCharactersFromType('ul', 0)
      const newText = head + 'Hello worl\n'
      const changeContext = mockDeltaChangeContext(head.length + 10, head.length + 11, head.length + 11)
      const originalDelta = mockDocumentDelta([
        { insert: getHeadingCharactersFromType('ul', 0) + 'Hello world' },
        { insert: '\n', attributes: { $type: 'ul' } }
      ])
      const { finalDelta: normalizedDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(normalizedDelta.ops).toEqual([
        { insert: getHeadingCharactersFromType('ul', 0) + 'Hello worl' },
        { insert: '\n', attributes: { $type: 'ul' } },
        { insert: getHeadingCharactersFromType('ul', 0) },
        { insert: '\n', attributes: { $type: 'ul' } }
      ])
    })
    it('should not remove newline character when reaching the beginning of a line', () => {
      const changeContext = mockDeltaChangeContext(3, 2)
      const newText = 'A\n\nC\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'A\nB\nC\n' }
      ])
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: 'A\n\nC\n' }
      ])
    })
    it('should retain first newline character and remove next newline when removing newline', () => {
      const changeContext = mockDeltaChangeContext(2, 1)
      const newText = 'A\nC\n'
      const originalDelta = mockDocumentDelta([
        { insert: 'A' },
        { insert: '\n', attributes: { $type: 'custom' } },
        { insert: '\nC\n' }
      ])
      const { finalDelta } = originalDelta.applyTextDiff(newText, changeContext)
      expect(finalDelta.ops).toEqual([
        { insert: 'A' },
        { insert: '\n', attributes: { $type: 'custom' } },
        { insert: 'C\n' }
      ])
    })
  })
  describe('applyTextTransformToSelection', () => {
    it('should clear attribute if its name and value are present in each operation of the selection', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { textDecoration: 'underline' } },
        { insert: 'test', attributes: { textDecoration: 'underline', bold: true } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection = Selection.fromObject({
        start: 6,
        end: 14
      })
      const { finalDelta } = delta.applyTextTransformToSelection(selection, 'textDecoration', 'underline')
      expect(finalDelta.ops).toEqual([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test' },
        { insert: 'test', attributes: { bold: true } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
    })
    it('should replace attribute if its name is present in each operation but its value is at least different once', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { textDecoration: 'underline' } },
        { insert: 'test', attributes: { textDecoration: 'strikethrough' } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 6,
        end: 14
      })
      const { finalDelta } = delta.applyTextTransformToSelection(selection, 'textDecoration', 'underline')
      expect(finalDelta.ops).toEqual([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'testtest', attributes: { textDecoration: 'underline' } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
    })
    it('should assign attribute if it is absent at least in one operation of the selection', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { textDecoration: 'underline' } },
        { insert: 'test', attributes: {} },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 6,
        end: 14
      })
      const { finalDelta } = delta.applyTextTransformToSelection(selection, 'textDecoration', 'underline')
      expect(finalDelta.ops).toEqual([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'testtest', attributes: { textDecoration: 'underline' } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
    })
    it('should assign attribute if it is absent at least in one operation of the selection and override other values', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { textDecoration: 'underline' } },
        { insert: 'test', attributes: { textDecoration: 'strikethrough' } },
        { insert: 'test', attributes: {} },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 6,
        end: 18
      })
      const { finalDelta } = delta.applyTextTransformToSelection(selection, 'textDecoration', 'underline')
      expect(finalDelta.ops).toEqual([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'testtesttest', attributes: { textDecoration: 'underline' } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
    })
  })
  describe('getSelectedTextAttributes', () => {
    it('should ignore attributes which are not present throughout the selection', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { bold: true } },
        { insert: 'test', attributes: { italic: true } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 6,
        end: 14
      })
      const attributes = delta.getSelectedTextAttributes(selection)
      expect(attributes).toEqual({})
    })
    it('should ignore nil attributes', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { bold: null } },
        { insert: 'test', attributes: { bold: undefined } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 6,
        end: 14
      })
      const attributes = delta.getSelectedTextAttributes(selection)
      expect(attributes).toEqual({})
    })
    it('should ignore empty attributes', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { bold: true } },
        { insert: 'test' },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 6,
        end: 14
      })
      const attributes = delta.getSelectedTextAttributes(selection)
      expect(attributes).toEqual({})
    })
    it('should discard values when a conflict occurs', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { textDecoration: 'underline' } },
        { insert: 'test', attributes: { textDecoration: 'strike' } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 6,
        end: 14
      })
      const attributes = delta.getSelectedTextAttributes(selection)
      expect(attributes).toEqual({})
    })
    it('should keep values present throughout the selection', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix', attributes: { untouched: true } },
        { insert: 'test', attributes: { textDecoration: 'strike', bold: true } },
        { insert: 'test', attributes: { textDecoration: 'strike' } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 6,
        end: 14
      })
      const attributes = delta.getSelectedTextAttributes(selection)
      expect(attributes).toEqual({ textDecoration: 'strike' })
    })
    it('should skip newlines', () => {
      const delta = mockDocumentDelta([
        { insert: 'prefix\n', attributes: { untouched: true } },
        { insert: 'test\ntest\n', attributes: { bold: true } },
        { insert: 'suffix', attributes: { untouched: true } }
      ])
      const selection: Selection = Selection.fromObject({
        start: 7,
        end: 17
      })
      const attributes = delta.getSelectedTextAttributes(selection)
      expect(attributes).toEqual({ bold: true })
    })
  })
  describe('getSelectionEncompassingLines', () => {
    it('should encompass characters left to starting cursor', () => {
      const delta = mockDocumentDelta([
        { insert: 'Hello\n' }
      ])
      expect(delta['getSelectionEncompassingLines'](mockSelection(2, 6))).toEqual(mockSelection(0, 6))
    })
    it('should encompass characters right to ending cursor', () => {
      const delta = mockDocumentDelta([
        { insert: 'Hello\n' }
      ])
      expect(delta['getSelectionEncompassingLines'](mockSelection(0, 4))).toEqual(mockSelection(0, 6))
    })
    it('should not encompass lines outside cursor scope', () => {
      const delta = mockDocumentDelta([
        { insert: 'All right\n' },
        { insert: 'Hello\n' },
        { insert: 'Felling good\n' }
      ])
      expect(delta['getSelectionEncompassingLines'](mockSelection(10, 14))).toEqual(mockSelection(10, 16))
    })
  })
  describe('getLineTypeInSelection', () => {
    it('should return "normal" when all lines attributes are empty', () => {
      const delta = mockDocumentDelta([
        { insert: 'hi\n' },
        { insert: 'feeling great', attributes: { bold: true } },
        { insert: '\n' }
      ])
      expect(delta.getLineTypeInSelection(mockSelection(0, 18))).toEqual('normal')
    })
    it('should return "normal" when at least one line attributes is empty', () => {
      const delta = mockDocumentDelta([
        { insert: 'hi\n' },
        { insert: 'feeling great', attributes: { bold: true } },
        { insert: '\n', attributes: { $type: 'misc' } },
        { insert: 'Felling good' },
        { insert: '\n', attributes: { $type: 'rand' } }
      ])
      expect(delta.getLineTypeInSelection(mockSelection(0, 31))).toEqual('normal')
    })
    it('should return "misc" when all line types are "misc"', () => {
      const delta = mockDocumentDelta([
        { insert: 'hi' },
        { insert: '\n', attributes: { $type: 'misc' } },
        { insert: 'feeling great', attributes: { bold: true } },
        { insert: '\n', attributes: { $type: 'misc' } },
        { insert: 'Felling good' },
        { insert: '\n', attributes: { $type: 'misc' } }
      ])
      expect(delta.getLineTypeInSelection(mockSelection(0, 31))).toEqual('misc')
    })
    it('should return "normal" when all line types are different', () => {
      const delta = mockDocumentDelta([
        { insert: 'hi' },
        { insert: '\n', attributes: { $type: 'misc' } },
        { insert: 'feeling great', attributes: { bold: true } },
        { insert: '\n', attributes: { $type: 'rand' } },
        { insert: 'Felling good' },
        { insert: '\n', attributes: { $type: 'misc' } }
      ])
      expect(delta.getLineTypeInSelection(mockSelection(0, 31))).toEqual('normal')
    })
    it('should take into account lines which are not fully selected', () => {
      const delta = mockDocumentDelta([
        { insert: 'hi' },
        { insert: '\n', attributes: { $type: 'misc' } }
      ])
      expect(delta.getLineTypeInSelection(mockSelection(0, 1))).toEqual('misc')
    })
  })
  describe('isLineInSelection', () => {
    const document = mockDocumentDelta([
      { insert: 'A\nBC\nD\n' }
    ])
    const lines = new LineWalker(document.ops).getLines()
    const firstLine = lines[0]
    const secondLine = lines[1]
    it('should match when the start selection index equals the begening of line index', () => {
      expect(isLineInSelection(mockSelection(0, 1), firstLine)).toBe(true)
    })
    it('should match when the end selection index equals the end of line index', () => {
      expect(isLineInSelection(mockSelection(1, 1), firstLine)).toBe(true)
      expect(isLineInSelection(mockSelection(4, 4), secondLine)).toBe(true)
    })
    it('should match when the start selection index is strictly inferior to the begening of line index and the end selection index is equal or superior to the begening of line index', () => {
      expect(isLineInSelection(mockSelection(1, 4), secondLine)).toBe(true)
      expect(isLineInSelection(mockSelection(1, 2), secondLine)).toBe(true)
    })
    it('should not match when the start selection index is gthen the end of line index', () => {
      expect(isLineInSelection(mockSelection(2, 2), firstLine)).toBe(false)
      expect(isLineInSelection(mockSelection(5, 5), secondLine)).toBe(false)
    })
  })
  describe('applyLineTypeToSelection', () => {
    describe('when applied with a non-text modifying line type', () => {
      it('should set lines type to "normal" when all lines have the same type', () => {
        const delta = mockDocumentDelta([
          { insert: 'A\nB\nC\n' }
        ])
        const selection = Selection.fromObject({
          start: 0,
          end: 6
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'normal')
        expect(normalizedDelta.ops).toEqual([
          { insert: 'A\nB\nC\n' }
        ])
      })
      it('should set lines type to type when all lines have a different type', () => {
        const delta = mockDocumentDelta([
          { insert: 'A' },
          { insert: '\n', attributes: { $type: 'misc' } },
          { insert: 'B' },
          { insert: '\n', attributes: { $type: 'rand' } }
        ])
        const selection = Selection.fromObject({
          start: 0,
          end: 6
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'misc' as TextLineType)
        expect(normalizedDelta.ops).toEqual([
          { insert: 'A' },
          { insert: '\n', attributes: { $type: 'misc' } },
          { insert: 'B' },
          { insert: '\n', attributes: { $type: 'misc' } }
        ])
      })
      it('should set lines type to type when all lines are normal', () => {
        const delta = mockDocumentDelta([
          { insert: 'A\n' },
          { insert: 'B\n' },
          { insert: 'C\n' }
        ])
        const selection = Selection.fromObject({
          start: 0,
          end: 6
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'misc' as TextLineType)
        expect(normalizedDelta.ops).toEqual([
          { insert: 'A' },
          { insert: '\n', attributes: { $type: 'misc' } },
          { insert: 'B' },
          { insert: '\n', attributes: { $type: 'misc' } },
          { insert: 'C' },
          { insert: '\n', attributes: { $type: 'misc' } }
        ])
      })
      it('should set lines type to type when at least one line is normal', () => {
        const delta = mockDocumentDelta([
          { insert: 'A\n' },
          { insert: 'B' },
          { insert: '\n', attributes: { $type: 'rand' } },
          { insert: 'C' },
          { insert: '\n', attributes: { $type: 'rand' } }
        ])
        const selection = Selection.fromObject({
          start: 0,
          end: 12
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'misc' as TextLineType)
        expect(normalizedDelta.ops).toEqual([
          { insert: 'A' },
          { insert: '\n', attributes: { $type: 'misc' } },
          { insert: 'B' },
          { insert: '\n', attributes: { $type: 'misc' } },
          { insert: 'C' },
          { insert: '\n', attributes: { $type: 'misc' } }
        ])
      })
    })
    describe('when applied with "ol" type', () => {
      it('should add prefix to encompassed lines starting at 0 index if no foregoing line index exists', () => {
        const delta = mockDocumentDelta([
          { insert: 'A\nB\nC\n' }
        ])
        const selection = Selection.fromObject({
          start: 0,
          end: 6
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'ol')
        expect(normalizedDelta.ops).toEqual([
          { insert: getHeadingCharactersFromType('ol', 0) + 'A' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 1) + 'B' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 2) + 'C' },
          { insert: '\n', attributes: { $type: 'ol' } }
        ])
      })
      it('should add prefix to encompassed lines starting at existing index if a foregoing line index exists', () => {
        const delta = mockDocumentDelta([
          { insert: getHeadingCharactersFromType('ol', 0) + '0' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: 'A\nB\nC\n' }
        ])
        const head = getHeadingCharactersFromType('ol', 0)
        const selection = Selection.fromObject({
          start: head.length + 2,
          end: head.length + 7
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'ol')
        expect(normalizedDelta.ops).toEqual([
          { insert: getHeadingCharactersFromType('ol', 0) + '0' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 1) + 'A' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 2) + 'B' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 3) + 'C' },
          { insert: '\n', attributes: { $type: 'ol' } }
        ])
      })
      it("should replace prefixes of 'ol' and 'ul' lines", () => {
        const delta = mockDocumentDelta([
          { insert: getHeadingCharactersFromType('ul', 0) + 'A' },
          { insert: '\n', attributes: { $type: 'ul' } },
          { insert: getHeadingCharactersFromType('ol', 1) + 'B' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 2) + 'C' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: 'D\n' }
        ])
        const selection = Selection.fromObject({
          start: 0,
          end: delta.length()
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'ol')
        expect(normalizedDelta.ops).toEqual([
          { insert: getHeadingCharactersFromType('ol', 0) + 'A' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 1) + 'B' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 2) + 'C' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 3) + 'D' },
          { insert: '\n', attributes: { $type: 'ol' } }
        ])
      })
    })
    describe('when applied with "normal" type to former "ol" lines', () => {
      it('should remove prefixes from encompassed lines', () => {
        const delta = mockDocumentDelta([
          { insert: getHeadingCharactersFromType('ol', 0) + 'A' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 1) + 'B' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 2) + 'C' },
          { insert: '\n', attributes: { $type: 'ol' } }
        ])
        const selection = Selection.fromObject({
          start: 0,
          end: 12
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'normal')
        expect(normalizedDelta.ops).toEqual([
          { insert: 'A\nB\nC\n' }
        ])
      })
      it('should only remove prefixes from encompassed lines', () => {
        const head = getHeadingCharactersFromType('ol', 0)
        const delta = mockDocumentDelta([
          { insert: head + 'A' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 1) + 'B' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: getHeadingCharactersFromType('ol', 2) + 'C' },
          { insert: '\n', attributes: { $type: 'ol' } }
        ])
        const selection = Selection.fromObject({
          start: head.length + 2,
          // @ts-ignore
          end: delta.delta.length()
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'normal')
        expect(normalizedDelta.ops).toEqual([
          { insert: getHeadingCharactersFromType('ol', 0) + 'A' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: 'B\nC\n' }
        ])
      })
      it('should recompute prefixes when a contiguous list is broken', () => {
        const head0 = getHeadingCharactersFromType('ol', 0)
        const head1 = getHeadingCharactersFromType('ol', 1)
        const head2 = getHeadingCharactersFromType('ol', 2)
        const head3 = getHeadingCharactersFromType('ol', 3)
        const delta = mockDocumentDelta([
          { insert: head0 + 'A' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: head1 + 'B' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: head2 + 'C' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: head3 + 'D' },
          { insert: '\n', attributes: { $type: 'ol' } }
        ])
        const firstCharOfThirdLine = head0.length + 1 + head1.length + 1 + 2
        const selection = Selection.fromObject({
          start: firstCharOfThirdLine,
          end: firstCharOfThirdLine
        })
        const { finalDelta: normalizedDelta } = delta.applyLineTypeToSelection(selection, 'normal')
        expect(normalizedDelta.ops).toEqual([
          { insert: head0 + 'A' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: head1 + 'B' },
          { insert: '\n', attributes: { $type: 'ol' } },
          { insert: `C\n${head0}D` },
          { insert: '\n', attributes: { $type: 'ol' } }
        ])
      })

    })
  })
})
