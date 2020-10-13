// Functions for storing and retrieving local storage values.

import { ClientFunction } from 'testcafe';

// Load Local Storage from the Global store
// https://github.com/DevExpress/testcafe/issues/2142#issuecomment-367618275
export const loadLocalStorageFromGlobalStorage = ClientFunction((storage) => {
    //console.log('Load');
    Object.keys(storage).forEach(key => {
        window.localStorage.setItem(key, storage[key])
        //console.log(key + ': ' + storage[key])
    });
    //document.querySelector("#items").innerHTML = localStorage.length;
});

// Store Local Stoage to the Global store
export const getActualLocalStorageStage = ClientFunction(() => {
    var storage = { };
    //console.log('Store');
    Object.keys(localStorage).forEach(key => {
        var value = localStorage.getItem(key);
        if (value > -1)
            storage[key] = value;
            //console.log(key + ': ' + value)
    });
    return storage;
});

