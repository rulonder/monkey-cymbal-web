// @ts-check
// central state
var STORE = {};
// Initialize Firebase configuration
// import polyfill for fetch
// require('whatwg-fetch')

// send petition
function requestToMOnkey () {
  fetch('/api/run').then(function (r) {console.log(r);}).catch(function (e) {console.log(e);});
}
// charts generation
function generateplot (data, id) {
  // Create SVG element
  // var width = parseInt(d3.select(id).style('width'), 10)
  var container = document.getElementById(id);
  var basewidth = container.getBoundingClientRect().width;
  var baseheight = container.getBoundingClientRect().height;
  var margin = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 15
  };
  var width = basewidth - margin.left - margin.right;
  var height = baseheight - margin.top - margin.bottom;
  var padding = 40;
  var svg = d3.select('#' + id)
    .append('div')
    .classed('svg-container', true)
    .append('svg')
    // .attr("preserveAspectRatio", "xMinYMin meet")
    // .attr("viewBox", "0 0 600 400")
    .attr('viewBox', '0 0 ' + width + ' ' + height + '')
    .attr('preserveAspectRatio', 'xMidYMid')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform',
      'translate( ' + margin.left + ',' + margin.top + ')');

  var yScale = d3.scaleLinear()
    .domain([d3.min(data, function (d) {
      return d.value;
    }) - 2, d3.max(data, function (d) {
      return d.value;
    }) + 2])
    .range([height - padding, padding]);
  var xScale = d3.scaleTime()
    .domain([d3.min(data, function (d) {
      return new Date(d.date);
    }), d3.max(data, function (d) {
      return new Date(d.date);
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
    });

  svg.append('path')
    .data([data])
    .attr('class', 'line')
    .attr('d', lineFunction);

  // tool tip
  var formatTime = d3.timeFormat('%H:%M:%S');
  // Define the div for the tooltip
  var div = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('left', '0' + 'px')
    .style('top', '0' + 'px');
  // Add the scatterplot
  svg.selectAll('dot')
    .data(data)
    .enter().append('circle')
    .attr('r', 5)
    .attr('cx', function (d) {
      return xScale(new Date(d.date));
    })
    .attr('cy', function (d) {
      return yScale(d.value);
    })
    .style('opacity', 0)
    .on('mouseover', function (d) {
      div.transition()
        .duration(100)
        .style('opacity', .9);
      div.html(formatTime(d.date) + '<br/>' + d.value + '°C')
        .style('left', (d3.event.pageX) + 'px')
        .style('top', (d3.event.pageY - 28) + 'px');
    })
    .on('mouseout', function (d) {
      div.transition()
        .duration(500)
        .style('opacity', 0);
    });
  // Create X axis
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', 'translate(0,' + (height - padding) + ')')
    .call(xAxis);
  // Create Y axis
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', 'translate(' + padding + ',0)')
    .call(yAxis);
}

function createElementWithClass (tag, classArray, content) {
  var elem = document.createElement(tag);
  elem.className = classArray;
  elem.innerHTML = content;
  return elem;
}

function wrapWithBadge (badge,elem) {
  var badgeWrapper = createElementWithClass('span', 'mdl-badge', '');
  var att = document.createAttribute('data-badge'); // Create a "class" attribute
  att.value = badge; // Set the value of the class attribute
  badgeWrapper.setAttributeNode(att); // Add the class attribute to <h1>
  badgeWrapper.appendChild(elem)
  return badgeWrapper
}

// charts generation
function generatebar (data, id) {
  // Create SVG element
  // var width = parseInt(d3.select(id).style('width'), 10)
  var table = document.getElementById(id);
  table.innerHTML = '';
  // beware mutable op
  data.sort(function (a, b) {
    return b.count - a.count;
  });
  dataSliced = data.slice(0, 10);
  dataSliced.map(function (item, position) {
    var row = createElementWithClass('tr', '', '');
    var index = createElementWithClass('td', '', '' + (position + 1));
    var name = createElementWithClass('td', 'mdl-data-table__cell--non-numeric', item.by.replace('.gmv.es', ''));
    var value = createElementWithClass('td', '', '' + item.count);
    row.appendChild(index);
    if (position == 0) {
      //row.appendChild(wrapWithBadge('★',name));
      row.appendChild(name);
    }else {
      row.appendChild(name);
    }
    row.appendChild(value);
    table.appendChild(row);
  });


/*<tr>
  <td class="mdl-data-table__cell--non-numeric">Laminate (Gold on Blue)</td>
  <td>10</td>
</tr>*/
}

// list of tabs
var tabs = ['container_button', 'container_graph', 'container_score'];
// switch between logged and unlogged configuration
function renderLogged () {
  document.getElementById('unloggedContainer').style.display = 'none';
  document.getElementById('loggedContainer').style.display = 'flex';
  select_button_tab();
  document.getElementById('container_button').className = document.getElementById('container_button').className.replace(
    'hidder', '');
}

function renderUnLogged () {
  select_button_tab();
  document.getElementById('loggedContainer').style.display = 'none';
  document.getElementById('unloggedContainer').style.display = 'flex';
  document.getElementById('container_button').className += ' hidder';
}
// hide a tab container
function reset_tab (tab_name) {
  var tab = document.getElementById(tab_name);
  tab.style.display = 'none';
  var tab_selector = document.getElementById(tab_name.replace('container', 'selector'));
  tab_selector.className = tab_selector.className.replace('activated', '').trim();
}
// activa a tab and reset the others
function activate_tab (tab_name) {
  var tab = document.getElementById(tab_name);
  tab.style.display = 'flex';
  var tab_selector = document.getElementById(tab_name.replace('container', 'selector'));
  tab_selector.className += ' activated';
}

function select_button_graph () {
  tabs.forEach(reset_tab);
  activate_tab('container_graph');
  // generate the graph
  getMeasurements();
}

function select_button_score () {
  tabs.forEach(reset_tab);
  activate_tab('container_score');
  // generate the graph
  getScores();
}

function select_button_tab () {
  tabs.forEach(reset_tab);
  activate_tab('container_button');
}

function openLoginUI () {
  document.getElementById('AppContent').style.display = 'none';
  document.getElementById('AuthContent').className = '';
  // retrieve the FirebaseUI Widget using Firebase.
  // or whether we leave that to developer to handle.
  document.getElementById('AppContent').style.display = '';
  document.getElementById('AuthContent').className += ' hidden';
  return false;
}

function logout () {
  //         Auth.GoogleSignInApi.signOut(mGoogleApiClient).setResultCallback(statfunctionus  {

  // })
}

// retrieve measurements list and plot them
function getMeasurements () {
  // clean 
  document.getElementById('measurements').innerHTML = '';
  var elems = document.getElementsByClassName('tooltip');
  for (var i = 0;i < elems.length; i++) {
    elem = elems[i];
    elem.parentNode.removeChild(elem);
  }
  fetch('/api/temp')
    .then(function (r) {return r.json();})
    .then(function (r) {
      console.log(r);
      generateplot(r.data, 'measurements');
    }
  )
    .catch(function (error) {
      console.log('request failed', error);
    });
}

// retrieve scores list and plot them
function getScores () {
  // clean 
  document.getElementById('scores').innerHTML = '';
  fetch('/api/scores')
    .then(function (r) {return r.json();})
    .then(function (r) {
      console.log(r);
      generatebar(r.data, 'scores');
    }
  )
    .catch(function (error) {
      console.log('request failed', error);
    });
}
// init the app
initApp = function () {
  select_button_tab();
  // // expose onlclick events
  window.requestToMOnkey = requestToMOnkey;
  window.logout = logout;
  window.select_button_tab = select_button_tab;
  window.select_button_graph = select_button_graph;
  window.select_button_score = select_button_score;
  window.openLoginUI = openLoginUI;
};

// wait for window to load
window.addEventListener('load', function () {
  initApp();
});
