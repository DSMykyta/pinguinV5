import test from 'node:test';
import assert from 'node:assert/strict';
import {getPageNumbers,DEFAULT_PAGE_SIZES} from './pagination.js';

test('legacy page pattern produces first, adjacent pages, ellipsis and last',()=>{
  assert.deepEqual(getPageNumbers(1,1),[1]);
  assert.deepEqual(getPageNumbers(7,4),[1,2,3,4,5,6,7]);
  assert.deepEqual(getPageNumbers(10,5),[1,'…',4,5,6,'…',10]);
  assert.deepEqual(getPageNumbers(10,1),[1,2,'…',10]);
  assert.deepEqual(getPageNumbers(10,9),[1,'…',8,9,10]);
});
test('page generation ignores invalid totals/pages and owns no global state',()=>{
  assert.deepEqual(getPageNumbers(0,1),[]);
  assert.deepEqual(getPageNumbers(4,9),[]);
  assert.deepEqual(DEFAULT_PAGE_SIZES,[10,25,50,100,0]);
});
