import test from 'node:test';
import assert from 'node:assert/strict';
import {canHostAcceptMissionItem,applyHostMissionItem,remotePickup} from '../../src/net/mission-item-authority.js';
const proposed=(state,owner)=>{const row=new Array(22).fill(0);row[1]=state;row[11]=owner;return row;};
test('host rejects a second player overwriting already-held mission items',()=>{
 const occupied={state:'held'};
 assert.equal(canHostAcceptMissionItem(occupied,proposed('held','p3'),'p3','p2'),false);
 assert.equal(canHostAcceptMissionItem(occupied,proposed('gone',''),'p3','p2'),false);
 assert.equal(canHostAcceptMissionItem(occupied,proposed('rest',''),'p3','p2'),false);
 assert.equal(canHostAcceptMissionItem(occupied,proposed('rest',''),'p2','p2'),true);
});
test('only host-confirmed pickup can transition a known object to held',()=>{
 assert.equal(canHostAcceptMissionItem({state:'rest'},proposed('held','p2'),'p2',''),false);
 assert.equal(canHostAcceptMissionItem({state:'held'},proposed('held','p2'),'p2','p2'),true);
 assert.equal(canHostAcceptMissionItem({state:'rest'},proposed('held','p7'),'p2',''),false);
 assert.equal(canHostAcceptMissionItem(null,proposed('held','p2'),'p2',''),true); // newly generated stage item
});
test('mission owner accepts other player pickup even though they own the mission scope',()=>{
 assert.equal(applyHostMissionItem({state:'placed',ownerKey:''},{state:'held',ownerKey:'p3'},'p2',2000),true);
 assert.equal(remotePickup('placed','held','','p3'),true);
 assert.equal(remotePickup('rest','held','','p3'),true);
 assert.equal(remotePickup('held','held','p3','p3'),false);
});
test('short local pickup prediction is protected, rejected pickup reconciles after timeout',()=>{
 const current={state:'held',ownerKey:'p2',pendingAt:1000},server={state:'rest',ownerKey:''};
 assert.equal(applyHostMissionItem(current,server,'p2',1260),false);
 assert.equal(applyHostMissionItem(current,server,'p2',1600),true);
 assert.equal(applyHostMissionItem(current,{state:'held',ownerKey:'p3'},'p2',1100),true);
 assert.equal(applyHostMissionItem({state:'held',ownerKey:'p2'}, {state:'held',ownerKey:'p2'}, 'p2',2000),false);
});
