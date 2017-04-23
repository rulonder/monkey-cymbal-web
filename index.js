var SerialPort = require('serialport')
var firebase = require("firebase-admin")

// serial port definition
var port = new SerialPort('COM4', {
  baudRate: 9600,
  encoding: 'ascii',
  parser: SerialPort.parsers.readline("\n")
})

//var serviceAccount = require("serviceAccountCredentials.json")
firebase.initializeApp({
  credential: firebase.credential.cert("serviceAccountCredentials.json"),
  databaseURL: "https://<your-db>.firebaseio.com",
  databaseAuthVariableOverride: {
    uid: "monkey-worker"
  }
})
// Simple App State
const STATE = {
  angle: 45.0,
  offset: 0.0,
  lasPetition: new Date(0)
}
// get server time offset
var angleRef = firebase.database().ref("config/angle")
angleRef.on("value", function (snap) {
  /** @type {Number} */
  var angle = snap.val()
  STATE.angle = angle
})
// get server time offset
var offsetRef = firebase.database().ref(".info/serverTimeOffset")
offsetRef.on("value", function (snap) {
  var offset = snap.val()
  STATE.offset = offset
})
/**
 * seconds from date1 to date2
 * 
 * @param {Date} date1 
 * @param {Date} date2 
 */
function secsBetween(date1, date2) {
  //Get 1 day in milliseconds
  var one_sec = 1000
  // Convert both dates to milliseconds
  var date1_ms = date1.getTime()
  var date2_ms = date2.getTime()

  // Calculate the difference in milliseconds
  var difference_ms = date2_ms - date1_ms
  // Convert back to seconds and return
  return Math.round(difference_ms / one_sec)
}

/**
 * seconds from date to now
 * 
 * @param {Date} date
 */
function secsFromNow(date) {
  return secsBetween(date, new Date())
}

/**
 * seconds from date to now, corrected with server offset
 * 
 * @param {Date} date
 */
function secsFromNowCorrected(date) {
  return secsBetween(new Date(date.getTime() + STATE.offset), new Date())
}


function init_app() {
  // As an admin, the app has access to read and write all data, regardless of Security Rules
  var db = firebase.database()
  // the petitions DB handler
  var petitions_ref = db.ref("petitions")
  petitions_ref.orderByChild("date").limitToLast(1).on("child_added", function (snapshot) {
    const petition_date = new Date(snapshot.val().date)
    console.log("petition at :" + petition_date)
    if (validatePetition(petition_date)) {
      STATE.lasPetition = petition_date
      run_servo()
    } else {
      console.log('rejected petition')
    }
  })

  // validate a petition to operate the servo
  function validatePetition(petition_date) {
    // must not be older than 2 seconds
    const notOld = (Math.abs(secsFromNowCorrected(petition_date)) < 2)
    // must be at least 1 second between petitions
    const niceRatio = secsBetween(STATE.lasPetition, petition_date) > 1
    // operated at an apporpiate time so no one is waken up
    const appropiateTime = petition_date.getHours() > 7 && petition_date.getHours() < 20
    return (notOld && niceRatio && appropiateTime)
  }
  // the measurements DB
  // define the tempertaure values database
  var temp_ref = db.ref("measurements/temp")
  const addTempMeasurement = (value) => {
    temp_ref.push({
      type: 'Temperature',
      value: value,
      date: firebase.database.ServerValue.TIMESTAMP
    })
  }
  // define the humidity values database
  var humidity_ref = db.ref("measurements/humidity")
  const addHumMeasurement = (value) => {
    humidity_ref.push({
      type: 'Humidity',
      value: value,
      date: firebase.database.ServerValue.TIMESTAMP
    })
  }

  // send the command to operate the servo to the serial port
  function run_servo() {
    // adjust integer to 3 figures
    angleFixed = ("00" + STATE.angle).slice(-3)
    const buf5 = Buffer.from('joke' + angleFixed + '.', 'ascii')
    port.write(buf5, function (err) {
      if (err) {
        return console.log('Error on write: ', err.message)
      }
      console.log('message written')
    })
  }

  // Request measurements to the serial port
  function request_meas() {
    const buf5 = Buffer.from('meas.', 'ascii')
    port.write(buf5, function (err) {
      if (err) {
        return console.log('Error on write: ', err.message)
      }
      console.log('message written')
    })
  }


  /**
   * Parse the measurements
   * @param {String} data 
   * @param {Function} cb 
   */
  const parseMeasurements = (data, cb) => {
    data = data.trim()
    try {
      parsed_data = JSON.parse(data)
      cb(null, parsed_data)
    } catch (error) {
      cb(error)
    }
  }

  // handle received data on serial port
  port.on('data', function (data) {
    console.log('Data: ' + data)
    parseMeasurements(data, (err, data) => {
      if (err) {
        console.log('error parsing')
      } else {
        addTempMeasurement(data["temperature"])
        addHumMeasurement(data["humidity"])
      }
    })
  })

  // handle error data on serial port
  port.on('error', function (data) {
    console.log('Error in port: ' + data)
  })
  // request measurements each 5 minutes
  setInterval(request_meas, 1000 * 60 * 5)
}

// init the serial
port.on('open', function () {
  // wait to start properly
  setTimeout(() => {
    init_app()
  }, 2000)
})