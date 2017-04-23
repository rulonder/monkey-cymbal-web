    // central state
    const STORE = {}
    // Initialize Firebase configuration
    var config = require('./config.firebase.js')
    // var config = {
    //     apiKey: "AIzaSyBdMmfbBWZEM9O6isRThMQTiPJfXwXUUyE",
    //     authDomain: "monkey-ae084.firebaseapp.com",
    //     databaseURL: "https://monkey-ae084.firebaseio.com",
    //     projectId: "monkey-ae084",
    //     storageBucket: "monkey-ae084.appspot.com",
    //     messagingSenderId: "354718688827"
    // };
    firebase.initializeApp(config);
    // send petition
    function requestToMOnkey() {
        firebase.database().ref('petitions/').push({
            user: STORE.user.email,
            date: firebase.database.ServerValue.TIMESTAMP,
            action: "play it"
        });
    }

    // list of tabs
    var tabs = ["container_button", "container_user", "container_graph"]
    // switch between logged and unlogged configuration
    function renderLogged() {
        document.getElementById("unloggedContainer").style.display = "none"
        document.getElementById("loggedContainer").style.display = "flex"
        select_button_tab()
        document.getElementById("container_button").className = document.getElementById("container_button").className.replace(
            'hidder', '')
    }

    function renderUnLogged() {
        select_button_tab()
        document.getElementById("loggedContainer").style.display = "none"
        document.getElementById("unloggedContainer").style.display = "flex"
        document.getElementById("container_button").className += ' hidder'
    }
    // hide a tab container
    function reset_tab(tab_name) {
        var tab = document.getElementById(tab_name)
        tab.style.display = "none"
        var tab_selector = document.getElementById(tab_name.replace('container', 'selector'))
        tab_selector.className = tab_selector.className.replace('activated', '').trim()
    }
    // activa a tab and reset the others
    function activate_tab(tab_name) {
        var tab = document.getElementById(tab_name)
        tab.style.display = "flex"
        var tab_selector = document.getElementById(tab_name.replace('container', 'selector'))
        tab_selector.className += ' activated'
    }
    // tab selection functions
    function select_user_tab() {
        tabs.forEach(reset_tab)
        activate_tab("container_user")
    }

    function select_button_graph() {
        tabs.forEach(reset_tab)
        activate_tab("container_graph")
        // generate the graph
        getMeasurements()
    }

    function select_button_tab() {
        tabs.forEach(reset_tab)
        activate_tab("container_button")
    }

    function openLoginUI() {
        document.getElementById("AppContent").style.display = 'none';
        document.getElementById("AuthContent").className = ''
        // retrieve the FirebaseUI Widget using Firebase.
        var ui = STORE.ui
        var uiConfig = {
            callbacks: {
                signInSuccess: function (currentUser, credential, redirectUrl) {
                    console.log('login sucess')
                    // Return type determines whether we continue the redirect automatically
                    // or whether we leave that to developer to handle.
                    document.getElementById("AppContent").style.display = ''
                    document.getElementById("AuthContent").className += ' hidden'
                    return false;
                },
                uiShown: function () {
                    // The widget is rendered.
                }
            },
            credentialHelper: firebaseui.auth.CredentialHelper.ACCOUNT_CHOOSER_COM,
            // Query parameter name for mode.
            queryParameterForWidgetMode: 'mode',
            // success url.
            signInSuccessUrl: '',
            // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
            signInFlow: 'popup',
            signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
            // Terms of service url.
            tosUrl: '<your-tos-url>'
        };
        // The start method will wait until the DOM is loaded.
        ui.start('#firebaseui-auth-container', uiConfig);
    }

    function logout() {
        //         Auth.GoogleSignInApi.signOut(mGoogleApiClient).setResultCallback(status => {
        firebase.auth().signOut();
        //});
    }

    // retrieve measurements list and plot them
    function getMeasurements() {
        // clean 
        document.getElementById('measurements').innerHTML = ''
        // retrieve from db
        var temp_ref = firebase.database().ref("measurements/temp")
        temp_ref.orderByChild("date").limitToLast(100).on("value", function (snap) {
            var data = [];
            snap.forEach(function(a) {
                data.push(a.val())
            })
            STORE.data = data
            generateplot(STORE.data, 'measurements')
        })
    }
    // init the app
    initApp = function () {
        STORE.ui = new firebaseui.auth.AuthUI(firebase.auth());
        firebase.auth().onAuthStateChanged(function (user) {
            console.log('USER is' + user)
            if (user) {
                // User is signed in.
                STORE.user = user
                var displayName = user.displayName;
                // var email = user.email;
                // var emailVerified = user.emailVerified;
                var photoURL = user.photoURL;
                // var uid = user.uid;
                // var providerData = user.providerData;
                document.getElementById("username").innerText = displayName
                document.getElementById("userimg").src = photoURL
                renderLogged()
            } else {
                // User is signed out.
                renderUnLogged()
            }
        }, function (error) {
            console.log(error);
        });

        // Add onlclick events
        window.requestToMOnkey=requestToMOnkey
        window.logout=logout
        window.select_button_tab=select_button_tab
        window.select_button_graph=select_button_graph
        window.select_user_tab=select_user_tab
        window.openLoginUI=openLoginUI
    };

    // charts generation
    function generateplot(data, id) {
        //Create SVG element
        //var width = parseInt(d3.select(id).style('width'), 10);
        var container = document.getElementById(id)
        var basewidth = container.getBoundingClientRect().width
        var baseheight = container.getBoundingClientRect().height
        var margin = {
            top: 10,
            right: 10,
            bottom: 10,
            left: 15
        }
        var width = basewidth - margin.left - margin.right
        var height = baseheight - margin.top - margin.bottom;
        var padding = 40;
        var svg = d3.select('#' + id)
            .append("div")
            .classed("svg-container", true)
            .append("svg")
            // .attr("preserveAspectRatio", "xMinYMin meet")
            // .attr("viewBox", "0 0 600 400")
            .attr("viewBox", "0 0 " + width + " " + height + "")
            .attr("preserveAspectRatio", "xMidYMid")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform",
                "translate( " + margin.left + "," + margin.top + ")");

        var yScale = d3.scaleLinear()
            .domain([0, d3.max(data, function (d) {
                return d.value
            }) + 2])
            .range([height - padding, padding]);
        var xScale = d3.scaleTime()
            .domain([d3.min(data, function (d) {
                return new Date(d.date)
            }), d3.max(data, function (d) {
                return new Date(d.date)
            })])
            .range([padding, width - padding]);
        var xAxis = d3
            .axisBottom(xScale)
            .ticks(3)
            .tickFormat(d3.timeFormat('%m/%d %H:%M'));
        var yAxis = d3
            .axisLeft(yScale)
            .ticks(6);
        var lineFunction = d3.line()
            .x(function (d) {
                return xScale(new Date(d.date));
            })
            .y(function (d) {
                return yScale(d.value);
            })

        svg.append("path")
            .data([data])
            .attr("class", "line")
            .attr("d", lineFunction);
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + (height - padding) + ")")
            .call(xAxis);
        //Create Y axis
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);
    }
    // wait for window to load
    window.addEventListener('load', function () {
        initApp()
    });