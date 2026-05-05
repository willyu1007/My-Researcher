import assert from 'node:assert/strict';
import test from 'node:test';
import { LiteratureGrobidFulltextParser } from './literature-grobid-fulltext-parser.js';

test('GROBID TEI parser extracts sections, paragraphs, and layout anchors', () => {
  const parser = new LiteratureGrobidFulltextParser();
  const result = parser.parseTei([
    '<TEI xmlns="http://www.tei-c.org/ns/1.0">',
    '<text><body>',
    '<div xml:id="section-0001" coords="1,10,20,500,40">',
    '<head>Method</head>',
    '<p xml:id="para-0001" coords="1,10,70,500,80">The method paragraph describes the model.</p>',
    '<formula xml:id="formula-0001" coords="1,15,160,200,40">y = f(x)</formula>',
    '<figure xml:id="figure-0001" coords="2,20,30,240,120"><label>Figure 1</label><figDesc>Architecture overview.</figDesc></figure>',
    '</div>',
    '</body></text>',
    '</TEI>',
  ].join(''));

  assert.match(result.normalizedText, /# Method/);
  assert.equal(result.sections[0]?.sectionId, 'section-0001');
  assert.equal(result.paragraphs[0]?.paragraphId, 'para-0001');
  assert.equal(result.paragraphs[0]?.pageNumber, 1);
  const figure = result.anchors.find((anchor) => anchor.anchorType === 'figure');
  assert.equal(figure?.anchorId, 'figure-0001');
  assert.equal(figure?.pageNumber, 2);
  assert.deepEqual(figure?.bbox, {
    raw: '2,20,30,240,120',
    boxes: [{ page: 2, x: 20, y: 30, width: 240, height: 120 }],
  });
  assert.equal(result.anchors.some((anchor) => anchor.anchorType === 'formula'), true);
});
