// @flow
import { combineReducers } from 'redux';
import { routerReducer as router } from 'react-router-redux';
import counter from './counter';
import wechat from './wechat'

const rootReducer = combineReducers({
  counter,
  wechat,
  router,
});

export default rootReducer;
