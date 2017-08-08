export const UPDATE_CONTACTS = 'UPDATE_CONTACTS';
export const UPDATE_ROOMS = 'UPDATE_ROOMS';
export const UPDATE_SELECTED_ROOM = "UPDATE_SELECTED_ROOM";
export const UPDATE_LOGIN_URL = "UPDATE_LOGIN_URL";
export const LOGIN_SUCCESS = "LOGIN_SUCCESS";

export function updateContacts(contacts) {
  return {
    type: UPDATE_CONTACTS,
    payload: contacts
  };
}

export function updateRooms(rooms) {
  return {
    type: UPDATE_ROOMS,
    payload: rooms
  };
}

export function updateSelectedRoom(room){
  return {
    type: UPDATE_SELECTED_ROOM,
    payload: room
  }
}

export function updateLoginUrl(url) {
  return {
    type: UPDATE_LOGIN_URL,
    payload: url
  };
}

export function loginSuccess(isLogin) {
  return {
    type: LOGIN_SUCCESS,
    payload: isLogin
  };
}

// export function incrementIfOdd() {
//   return (dispatch: (action: actionType) => void, getState: () => counterStateType) => {
//     const { counter } = getState();

//     if (counter % 2 === 0) {
//       return;
//     }

//     dispatch(increment());
//   };
// }

// export function incrementAsync(delay: number = 1000) {
//   return (dispatch: (action: actionType) => void) => {
//     setTimeout(() => {
//       dispatch(increment());
//     }, delay);
//   };
// }
