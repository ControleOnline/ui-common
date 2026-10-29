import React from 'react';
import renderer, {act} from 'react-test-renderer';
import UserAvatar from '@controleonline/ui-common/src/react/components/UserAvatar';
jest.mock('@env', () => ({env: {API_ENTRYPOINT: 'https://api.synthetic.test', DOMAIN: 'synthetic.test'}}));
jest.mock('@store', () => ({useStore: jest.fn()}));
jest.mock('react-native', () => ({Platform: {OS: 'web'}, Image: 'Image', Text: 'Text', View: 'View', StyleSheet: {create: value => value}}));
const {useStore} = require('@store');
const imageUrl = 'https://api.synthetic.test/files/42/download';
const ok = () => ({ok: true, status: 200, blob: async () => ({})});
let tree;
let original;
const render = async props => {await act(async () => {tree = renderer.create(<UserAvatar imageUrl={imageUrl} useGravatar={false} {...props}/>);});};
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  original = {fetch: global.fetch, storage: global.localStorage, create: URL.createObjectURL, revoke: URL.revokeObjectURL};
  global.localStorage = {getItem: () => null};
  global.fetch = jest.fn().mockResolvedValue(ok());
  URL.createObjectURL = jest.fn(() => 'blob:synthetic');
  URL.revokeObjectURL = jest.fn();
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = undefined;
  global.fetch = original.fetch; global.localStorage = original.storage;
  URL.createObjectURL = original.create; URL.revokeObjectURL = original.revoke;
});
it('renders initials before an image and authentication context exist', async () => {
  await render({imageUrl: undefined, imageAuthContext: undefined, name: 'Leandro'});
  expect(tree.root.findAllByType('Image')).toHaveLength(0);
  expect(tree.root.findByType('Text').props.children).toBe('L');
  expect(fetch).not.toHaveBeenCalled();
});
it('waits for session then fetches the same private URL', async () => {
  await render({imageAuthContext: ''});
  expect(tree.root.findAllByType('Image')).toHaveLength(0);
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => {tree.update(<UserAvatar imageUrl={imageUrl} useGravatar={false} imageAuthContext="session-ready"/>);});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1].headers['API-TOKEN']).toBe('session-ready');
});
it('uses the configured protocol for private images from the same API authority', async () => {
  await render({imageUrl: imageUrl.replace('https:', 'http:'), imageAuthContext: 'ready'});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe(imageUrl);
  expect(tree.root.findByType('Image').props.source.uri).toBe('blob:synthetic');
});
it.each([401, 403, 404])('does not retry status %s', async status => {
  fetch.mockResolvedValue({ok: false, status});
  await render({imageAuthContext: 'ready'});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType('Image')).toHaveLength(0);
});
it.each(['network', 503])('recovers once from %s', async failure => {
  if (failure === 'network') fetch.mockRejectedValueOnce(new TypeError('network'));
  else fetch.mockResolvedValueOnce({ok: false, status: failure});
  await render({imageAuthContext: 'ready'});
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(tree.root.findByType('Image').props.source.uri).toBe('blob:synthetic');
});
it('bounds repeated failures to two attempts', async () => {
  fetch.mockRejectedValue(new TypeError('network'));
  await render({imageAuthContext: 'ready'});
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('resets Image.onError after session changes', async () => {
  await render({imageAuthContext: 'first'});
  await act(async () => {tree.root.findByType('Image').props.onError();});
  expect(tree.root.findAllByType('Image')).toHaveLength(0);
  await act(async () => {tree.update(<UserAvatar imageUrl={imageUrl} useGravatar={false} imageAuthContext="second"/>);});
  expect(tree.root.findByType('Image').props.source.uri).toBe('blob:synthetic');
  expect(fetch.mock.calls.at(-1)[1].headers['API-TOKEN']).toBe('second');
});
it('never fetches credentials for an untrusted origin', async () => {
  await render({imageUrl: 'https://external.synthetic.test/files/42/download', imageAuthContext: 'private'});
  expect(fetch).not.toHaveBeenCalled();
});
it('aborts unmounted request and avoids a late blob URL', async () => {
  let resolveBlob;
  fetch.mockResolvedValue({ok: true, blob: () => new Promise(resolve => {resolveBlob = resolve;})});
  await render({imageAuthContext: 'ready'});
  const signal = fetch.mock.calls[0][1].signal;
  await act(async () => {tree.unmount(); tree = undefined;});
  await act(async () => {resolveBlob({});});
  expect(signal.aborted).toBe(true);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it('revokes successful blobs when unmounted', async () => {
  await render({imageAuthContext: 'ready'});
  expect(tree.root.findByType('Image').props.source.uri).toBe('blob:synthetic');
  await act(async () => {tree.unmount(); tree = undefined;});
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
});
it('ignores the earlier session response after a context change', async () => {
  let resolveOld;
  fetch.mockImplementationOnce(() => new Promise(resolve => {resolveOld = resolve;}));
  await render({imageAuthContext: 'first'});
  await act(async () => {tree.update(<UserAvatar imageUrl={imageUrl} useGravatar={false} imageAuthContext="second"/>);});
  await act(async () => {resolveOld(ok());});
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType('Image').props.source.uri).toBe('blob:synthetic');
});
