const initialState = {
  contacts: [],
  rooms: [],
  selectedRoom: null,
  isLogin: false
};
import {UPDATE_SELECTED_ROOM, UPDATE_CONTACTS, UPDATE_ROOMS, UPDATE_LOGIN_URL, LOGIN_SUCCESS} from '../actions/wechat'

// function initializeState() {
//   const userProfile = loadUserProfile();
//   return Object.assign({}, initialState, userProfile);
// }

export default function wechat(state = initialState, action = {}) {
  switch (action.type) {
    case UPDATE_LOGIN_URL:
      return {
        ...state,
        loginUrl: action.payload
      }
    case LOGIN_SUCCESS:
      return {
        ...state,
        isLogin: action.payload
      } 
    case UPDATE_SELECTED_ROOM:
      return {
        ...state,
        selectedRoom: action.payload
      }
    case UPDATE_CONTACTS:
      return {
        ...state,
        contacts: action.payload
      }
    case UPDATE_ROOMS:
      return {
        ...state,
        rooms: action.payload
      }  
    default:
      return state;
  }
}
