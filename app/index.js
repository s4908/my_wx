import React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import Root from './containers/Root';
import { configureStore, history } from './store/configureStore';
import './app.global.css';

import jQuery from 'jquery'
import {updateLoginUrl, loginSuccess} from './actions/wechat'

global.$ = global.jQuery = jQuery;
require('bootstrap/dist/js/bootstrap.js')

const store = configureStore();
const { ipcRenderer } = require('electron');

ipcRenderer.on('doDispatch', (event, args) => {
  store.dispatch(args)
})


global.requestCounter = 0;

export function request(endpoint, params = null) {
  return new Promise((resolve, reject) => {
    const serialNum = Date.now().toString() + global.requestCounter;
    global.requestCounter ++;
    ipcRenderer.send('wx:api', { endpoint, params, serialNum });

    ipcRenderer.once(`wx:api:${endpoint}:${serialNum}`, (event, result) => {
      if (result.hasOwnProperty('error')) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}



render(
  <AppContainer>
    <Root store={store} history={history} />
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./containers/Root', () => {
    const NextRoot = require('./containers/Root'); // eslint-disable-line global-require
    render(
      <AppContainer>
        <NextRoot store={store} history={history} />
      </AppContainer>,
      document.getElementById('root')
    );
  });
}
