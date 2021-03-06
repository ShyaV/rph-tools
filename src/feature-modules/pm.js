var pmModule = (function () {
  var pmSettings = {
    'audioUrl': 'http://chat.rphaven.com/sounds/imsound.mp3',
    'noIcons': false,
  };

  var localStorageName = "rpht_PmModule";

  var html = {
    'tabId': 'pm-module',
    'tabName': 'PMs',
    'tabContents': '<h3>PM Settings</h3>' +
      '<div><h4>PM Away System</h4>' +
      '</p>' +
      '<p>Username</p>' +
      '<select style="width: 800px;" id="pmNamesDroplist" size="10"></select><br><br>' +
      '<label class="rpht_labels">Away Message: </label><input type="text" id="awayMessageTextbox" name="awayMessageTextbox" maxlength="300" placeholder="Away message...">' +
      '<br /><br />' +
      '<button style="margin-left: 358px; "type="button" id="setAwayButton">Enable</button> <button type="button" id="removeAwayButton">Disable</button>' +
      '</div><div>' + 
      '<h4>Other Settings</h4>' +
      '</p>' +
      '<label class="rpht_labels">PM Sound: </label><input type="text" id="pmPingURL" name="pmPingURL">' +
      '<br /><br />' +
      '<label class="rpht_labels">Mute PMs: </label><input style="width: 40px;" type="checkbox" id="pmMute" name="pmMute">' +
      '<br /><br />' +
      '<label class="rpht_labels">No Image Icons: </label><input style="width: 40px;" type="checkbox" id="pmIconsDisable" name="pmIconsDisable">' 
  };

  var awayMessages = {};

  var init = function () {
    $('#pmNamesDroplist').change(function () {
      var userId = $('#pmNamesDroplist option:selected').val();
      var message = '';

      if (awayMessages[userId] !== undefined) {
        message = awayMessages[userId].message;
      }
      $('input#awayMessageTextbox').val(message);
    });

    $('#setAwayButton').click(function () {
      setPmAway();
    });

    $('#removeAwayButton').click(function () {
      removePmAway();
    });

    $('#pmPingURL').change(function () {
      if (validateSetting('pmPingURL', 'url')) {
        pmSettings.audioUrl = getInput('pmPingURL');
        $('#im-sound').children("audio").attr('src', pmSettings.audioUrl);
        saveSettings();
      }
    });

    $('#pmMute').change(function () {
      if ($('#pmMute').is(":checked")) {
        $('#im-sound').children("audio").attr('src', '');
      } else {
        $('#im-sound').children("audio").attr('src', pmSettings.audioUrl);
      }
    });

    $('#pmIconsDisable').change(function () {
      pmSettings.noIcons = getCheckBox('pmIconsDisable');
      saveSettings();
    });

    loadSettings(JSON.parse(localStorage.getItem(localStorageName)));

    socket.on('pm', function (data) {
      handleIncomingPm(data);
    });

    socket.on('outgoing-pm', function (data) {
      handleOutgoingPm(data);
    });
  }

  /****************************************************************************
   * Handles incoming PMs.
   * @param data - Data containing the PM.
   ****************************************************************************/
  function handleIncomingPm(data) {
    getUserById(data.to, function (fromUser) {
      if (!awayMessages[data.from]) {
        return;
      }

      if (awayMessages[data.from].enabled) {
        awayMessages[data.from].usedPmAwayMsg = true;
        socket.emit('pm', {
          'from': data.from,
          'to': data.to,
          'msg': awayMessages[data.from].message,
          'target': 'all'
        });
      }
    });
  }

  /****************************************************************************
   * Handles outgoing PMs.
   * @param data - Data containing the PM.
   ****************************************************************************/
  function handleOutgoingPm(data) {
    getUserById(data.from, function (fromUser) {
      if (!awayMessages[data.from]) {
        return;
      }

      if (!awayMessages[data.from].usedPmAwayMsg) {
        awayMessages[data.from].enabled = false;
        $('#pmNamesDroplist option').filter(function () {
          return this.value == data.from;
        }).css("background-color", "");
      }
      awayMessages[data.from].usedPmAwayMsg = false;
    });
  }

  /****************************************************************************
   * Sets up PM Away Messages
   ****************************************************************************/
  var setPmAway = function () {
    var userId = $('#pmNamesDroplist option:selected').val();
    var name = $("#pmNamesDroplist option:selected").html();
    if (!awayMessages[userId]) {
      var awayMsgObj = {
        "usedPmAwayMsg": false,
        "message": "",
        "enabled": false
      };
      awayMessages[userId] = awayMsgObj;
    } 
    
    if (!awayMessages[userId].enabled) {
      $("#pmNamesDroplist option:selected").html("[Away]" + name);
    }
    awayMessages[userId].enabled = true;
    awayMessages[userId].message = $('input#awayMessageTextbox').val();
    $("#pmNamesDroplist option:selected").css("background-color", "#FFD800");
    $("#pmNamesDroplist option:selected").prop("selected", false);

    console.log('RPH Tools[setPmAway]: Setting away message for',
      name, 'with message', awayMessages[userId].message);
  };

  /****************************************************************************
   * Removes PM away message
   ****************************************************************************/
  var removePmAway = function () {
    var userId = $('#pmNamesDroplist option:selected').val();

    if (!awayMessages[userId]) {
      return;
    }

    if (awayMessages[userId].enabled) {
      var name = $("#pmNamesDroplist option:selected").html();
      awayMessages[userId].enabled = false;
      $("#pmNamesDroplist option:selected").html(name.substring(6, name.length));
      $("#pmNamesDroplist option:selected").css("background-color", "");
      $('input#awayMessageTextbox').val("");
      console.log('RPH Tools[removePmAway]: Remove away message for', name);
    }
  };

  /****************************************************************************
   * Saves settings into the browser's local storage.
   ****************************************************************************/
  var saveSettings = function () {
    localStorage.setItem(localStorageName, JSON.stringify(pmSettings));
  };

  /****************************************************************************
   * Load settings from the browser's local storage.
   ****************************************************************************/
  var loadSettings = function (storedSettings) {
    if (storedSettings !== null) {
      pmSettings = storedSettings;
    }
    populateSettings();
  };

  /****************************************************************************
   * Deletes the local storage settings
   ****************************************************************************/
  var deleteSettings = function () {
    localStorage.removeItem(localStorageName);
    pmSettings = {
      'audioUrl': 'http://chat.rphaven.com/sounds/imsound.mp3',
      'noIcons': false,
    };
    populateSettings();
  };

  /****************************************************************************
   * Populate the GUI with settings from the browser's local storage
   ****************************************************************************/
  var populateSettings = function () {
    $('#pmPingURL').val(pmSettings.audioUrl);
    $('input#pmIconsDisable').prop("checked", pmSettings.noIcons);
  };

  var getSettings = function () {
    return pmSettings;
  };

  /**************************************************************************
   * Processes account events.
   * @param account - Data blob countaining the user's account.
   **************************************************************************/
  var processAccountEvt = function (account) {
    var users = account.users;
    clearUsersDropLists('pmNamesDroplist');
    for (i = 0; i < users.length; i++) {
      addUserToDroplist(users[i], $('#pmNamesDroplist'));
    }
  };

  return {
    init: init,

    getHtml: function () {
      return html;
    },

    toString: function () {
      return 'PM Module';
    },

    getSettings: getSettings,
    saveSettings: saveSettings,
    loadSettings: loadSettings,
    deleteSettings: deleteSettings,
    processAccountEvt: processAccountEvt,
  };
}());
