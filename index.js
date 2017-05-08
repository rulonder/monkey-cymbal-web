// define proxy
process.env.HTTP_PROXY = 'http://ptmproxy.gmv.es:80'
process.env.HTTPS_PROXY = 'http://ptmproxy.gmv.es:80'
var SerialPort = require('serialport')
var morgan = require('morgan')
var express = require('express')
var bodyParser = require('body-parser')
var sqlite3 = require('sqlite3')
// serial port definition
var port = new SerialPort('COM4', {
  baudRate: 9600,
  encoding: 'ascii',
  parser: SerialPort.parsers.readline('\n')
})
// create server
const app = express()
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

app.use(morgan('combined'))
// get name
const dns = require('dns')
// dns.reverse('172.22.60.5',(err,a)=>{console.log(a)})



// Simple App State
const STATE = {
  angle: 70.0,
  offset: 0.0,
  lasPetition: new Date(0)
}

/**
 * seconds from date1 to date2
 * 
 * @param {Date} date1 
 * @param {Date} date2 
 */
function secsBetween (date1, date2) {
  // Get 1 day in milliseconds
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
function secsFromNow (date) {
  return secsBetween(date, new Date())
}

/**
 * seconds from date to now, corrected with server offset
 * 
 * @param {Date} date
 */
function secsFromNowCorrected (date) {
  return secsBetween(new Date(date.getTime() + STATE.offset), new Date())
}

// validate a petition to operate the servo
function validatePetition (petition_date) {
  // must not be older than 2 seconds
  const notOld = (Math.abs(secsFromNowCorrected(petition_date)) < 2)
  // must be at least 1 second between petitions
  const niceRatio = secsBetween(STATE.lasPetition, petition_date) > 0.5
  // operated at an apporpiate time so no one is waken up
  const appropiateTime = petition_date.getHours() > 7 && petition_date.getHours() < 20
  return (notOld && niceRatio && appropiateTime)
}

// send the command to operate the servo to the serial port
function run_servo () {
  // adjust integer to 3 figures
  angleFixed = ('00' + STATE.angle).slice(-3)
  const buf5 = Buffer.from('joke' + angleFixed + '.', 'ascii')
  port.write(buf5, function (err) {
    if (err) {
      return console.log('Error on write: ', err.message)
    }
    console.log('message written')
  })
}

// Request measurements to the serial port
function request_meas () {
  const buf5 = Buffer.from('meas.', 'ascii')
  port.write(buf5, function (err) {
    if (err) {
      return console.log('Error on write: ', err.message)
    }
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

function init_app () {
  app.listen(6969)
  // sqlite
  var db = new sqlite3.Database('local.db')

  db.serialize(function () {
    db.run('CREATE TABLE IF NOT EXISTS meas (date INTEGER, type TEXT, value REAL)')
    db.run('CREATE TABLE IF NOT EXISTS users (name TEXT, pass TEXT)')
    db.run('CREATE TABLE IF NOT EXISTS petitions (date INTEGER, by TEXT)')
  })

  function cleanDB(){
      db.close()
  }

  function getUserData(name){
    db.get('SELECT * FROM users WHERE name =?',name,function(err,data){
      console.log(data)
    })
  }

  function addTempMeasurement(value){
    try{

     var stmt = db.prepare('INSERT INTO meas VALUES (?,?,?)')
    const timestamp = new Date().getTime()
    stmt.run( timestamp,'Temperature',value)
    stmt.finalize()
    } catch (e){
      console.log(e)
    }
  }
  function addPetition(petition_source){
    try{
     var stmt = db.prepare('INSERT INTO petitions VALUES (?,?)')
    const timestamp = new Date().getTime()
    stmt.run( timestamp,petition_source)
    stmt.finalize()
    } catch (e){
      console.log(e)
    }
  }
  function addHumMeasurement(value){
        try{
    var stmt = db.prepare('INSERT INTO meas VALUES (?,?,?)')
    const timestamp = new Date().getTime()
    stmt.run( timestamp,'Humidity',value)
    stmt.finalize()
        } catch (e){
      console.log(e)
    }
  }

  function getMeasurementsTemp(cb){
    db.serialize(()=>{
    db.all('SELECT * FROM meas WHERE type is "Temperature" ORDER BY date DESC LIMIT 600 ', function (err, data) {
      //  example { timestamp: 12312321, name: 'fdsf', value: 5456 }
      cb(null, data)
    })
    
    })
  }

  function getScores(cb){
    db.serialize(()=>{
    db.all('SELECT COUNT(by) as count, by FROM petitions GROUP BY by', function (err, data) {
      //  example {  by: 'fdsf', count: 5456 }
      cb(null, data)
    })
    
    })
  }
  // *****************************************************************************************************
app.use('/static', express.static('public'))
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html')
})

app.post('/login',function (req, res) {
  const user = req.body.username
  const pass = req.body.password
  res.sendFile(__dirname + '/public/index.html')
})

app.get('/api/run', function (req, res) {
    const petition_date = new Date()
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip
    // clean ip address
    ip = ip.replace('::ffff:','')
    console.log('petition at :' + petition_date + ' by '+ip)
    if (validatePetition(petition_date)) {
      STATE.lasPetition = petition_date
      run_servo()
      res.sendStatus(200)
    } else {
      console.log('rejected petition')
      res.sendStatus(404)
    }
     dns.reverse(ip,(err,a)=>{console.log('petition by :' + a);addPetition(a[0])})
})

app.get('/api/temp', function (req, res) {
  getMeasurementsTemp((err, meas)=>{
    res.json({'data': meas})
  })
})

app.get('/api/scores', function (req, res) {
  getScores((err, scores)=>{
    res.json({'data': scores})
  })
})

  // handle received data on serial port
  port.on('data', function (data) {
    parseMeasurements(data, (err, data) => {
      if (err) {
        console.log('error parsing')
      } else {
        addTempMeasurement(data['temperature'])
        addHumMeasurement(data['humidity'])
      }
    })
  })

  // handle error data on serial port
  port.on('error', function (data) {
    console.log('Error in port: ' + data)
  })
  // request measurements each 5 minutes
  setInterval(request_meas, 1000 * 60 * 5 )
  // clap for readiness
  run_servo()
}

// init the serial
port.on('open', function () {
  // wait to start properly
  setTimeout(() => {
    init_app()
  }, 2000)
})

// CLEAN UP
function Cleanup(callback) {

  // attach user callback to the process event emitter
  // if no callback, it will still exit gracefully on Ctrl-C
  callback = callback || function(){} 
  process.on('cleanup',callback)

  // do app specific cleaning before exiting
  process.on('exit', function () {
    process.emit('cleanup')
  })

  // catch ctrl+c event and exit normally
  process.on('SIGINT', function () {
    console.log('Ctrl-C...')
    process.exit(2)
  })

  //catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', function(e) {
    console.log('Uncaught Exception...')
    console.log(e.stack)
    process.exit(99)
  })
}