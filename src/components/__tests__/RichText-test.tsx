import React from 'react'
// Test renderer must be required after react-native.
import renderer from 'react-test-renderer'
import { RichText } from '@components/RichText'
import { defaultTextTransforms } from '@core/Transforms'
import { flattenTextChild } from '@test/vdom'
import { mockDocumentDelta } from '@test/document'
import { TextOp } from '@delta/operations'

describe('@components/<RichText>', () => {
  it('should renders without crashing', () => {
    const delta = mockDocumentDelta()
    const richText = renderer.create(
      <RichText textOps={delta.ops as TextOp[]} textTransformSpecs={defaultTextTransforms} />,
    )
    expect(richText).toBeTruthy()
  })
  it('should comply with document documentDelta by removing last newline character', () => {
    const delta = mockDocumentDelta([
      { insert: 'eheh' },
      { insert: '\n', attributes: { $type: 'normal' } },
      { insert: 'ahah' },
      { insert: '\n', attributes: { $type: 'normal' } },
      { insert: 'ohoh\n' },
    ])
    const richText = renderer.create(
      <RichText textOps={delta.ops as TextOp[]} textTransformSpecs={defaultTextTransforms} />,
    )
    const textContent = flattenTextChild(richText.root)
    expect(textContent.join('')).toEqual(['eheh', '\n', 'ahah', '\n', 'ohoh'].join(''))
  })
})
