/* global _ */
/*
 * Complex scripted dashboard
 * This script generates a dashboard object that Grafana can load. It also takes a number of user
 * supplied URL parameters (int ARGS variable)
 *
 * Global accessable variables
 * window, document, $, jQuery, ARGS, moment
 *
 * Return a dashboard object, or a function
 *
 * For async scripts, return a function, this function must take a single callback function,
 * call this function with the dasboard object
 * 
 * Author: Anatoliy Dobrosynets, Recorded Future, Inc.
 */

// accessable variables in this scope
var window, document, ARGS, $, jQuery, moment, kbn;

// use defaults for URL arguments
var arg_env  = 'prod';
var arg_i    = 'default';
var arg_span = 4;
var arg_from = '2h';

  if(!_.isUndefined(ARGS.span)) {
    arg_span = ARGS.span;
  }

  if(!_.isUndefined(ARGS.from)) {
    arg_from = ARGS.from;
  }

  if(!_.isUndefined(ARGS.env)) {
    arg_env = ARGS.env;
  }

  if(!_.isUndefined(ARGS.i)) {
    arg_i = ARGS.i;               // instance name
  }

  // return dashboard filter_list
  // optionally include 'All'
  function get_filter_object(name,query,show_all){
    show_all = (typeof show_all === "undefined") ? true : show_all;
    var arr = find_filter_values(query);
    var opts = [];
    for (var i in arr) {
      opts.push({"text":arr[i], "value":arr[i]});
    };
    if (show_all == true) {
      opts.unshift({"text":"All", "value": '{'+arr.join()+'}'});
    };
    return {
      type: "filter",
      name: name,
      query: query,
      options: opts,
      current: opts[0],
      includeAll: show_all
    }
  };

  // execute graphite-api /metrics/find query
  // return array of metric last names ( func('test.cpu-*') returns ['cpu-0','cpu-1',..] )
  function find_filter_values(query){
    var search_url = window.location.protocol + '//' + window.location.host + '/_graphite/metrics/find/?query=' + query;
    var res = [];
    var req = new XMLHttpRequest();
    req.open('GET', search_url, false);
    req.send(null);
    var obj = JSON.parse(req.responseText);
    for(var key in obj) {
      if (obj[key].hasOwnProperty("text")) {
        res.push(obj[key]["text"]);
      }
    }
    return res;
  };

  // execute graphite-api /metrics/expand query
  // return array of metric full names (func('*.cpu-*') returns ['test.cpu-0','test.cpu-1',..] )
  function expand_filter_values(query){
    var search_url = window.location.protocol + '//' + window.location.host + '/_graphite/metrics/expand/?query=' + query;
    var req = new XMLHttpRequest();
    req.open('GET', search_url, false);
    req.send(null);
    var obj = JSON.parse(req.responseText);
    if (obj.hasOwnProperty('results')) {
      return obj['results']; 
    } else { 
      return [];
    };
  };

  // used to calculate aliasByNode index in panel template
  function len(prefix){
    return prefix.split('.').length - 2;
  };

  /* 
    panel templates
  */

  // collectd

  function panel_collectd_cpu(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      renderer: "flot",
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: true,
      legend: {show: true},
      percentage: true,
      nullPointMode: "null",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "alias(sumSeries(nonNegativeDerivative(" + prefix + "[[instance]].cpu-*.cpu-user,0)),'user')" },
        { "target": "alias(sumSeries(nonNegativeDerivative(" + prefix + "[[instance]].cpu-*.cpu-system,0)),'system')" },
        { "target": "alias(sumSeries(nonNegativeDerivative(" + prefix + "[[instance]].cpu-*.cpu-idle,0)),'idle')" },
        { "target": "alias(sumSeries(nonNegativeDerivative(" + prefix + "[[instance]].cpu-*.cpu-wait,0)),'wait')" },
        { "target": "alias(sumSeries(nonNegativeDerivative(" + prefix + "[[instance]].cpu-*.cpu-steal,0)),'steal')" },
        { "target": "alias(sumSeries(nonNegativeDerivative(" + prefix + "[[instance]].cpu-*.cpu-nice,0)),'nice')" },
        { "target": "alias(sumSeries(nonNegativeDerivative(" + prefix + "[[instance]].cpu-*.cpu-softirq,0)),'irq')" },
        { "target": "alias(sumSeries(nonNegativeDerivative(" + prefix + "[[instance]].cpu-*.cpu-interrupt,0)),'intrpt')" },
      ],
      aliasColors: {
        "user": "#508642",
        "system": "#EAB839",
        "wait": "#890F02",
        "steal": "#E24D42",
        "idle": "#6ED0E0"
      }
    }
  };

  function panel_collectd_memory(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: true,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(movingMedian(" + prefix + "[[instance]].memory.memory-{used,free,cached,buffered},'15min')," +(idx+3)+ ")" },
      ],
      aliasColors: {
        "memory-free": "#629E51",
        "memory-used": "#1F78C1",
        "memory-cached": "#EF843C",
        "memory-buffered": "#CCA300"
      }
    }
  };

  function panel_collectd_loadavg(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 0,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(movingMedian(" + prefix + "[[instance]].load.load.midterm,'10min')," +(idx+4)+ ")" },
      ]
    }
  };

  function panel_collectd_swap_size(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0, leftMin: 0},
      lines: true,
      fill: 1,
      linewidth: 1,
      stack: true,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(" + prefix + "[[instance]].swap.swap-{free,used,cached}," +(idx+3)+ ")" },
      ],
      aliasColors: {
        "swap-used": "#1F78C1",
        "swap-cached": "#EAB839",
        "swap-free": "#508642"
      }
    }
  };

  function panel_collectd_swap_io(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(movingMedian(nonNegativeDerivative(keepLastValue(" + prefix + "[[instance]].swap.swap_io-in,10),0),'5min')," +(idx+3)+ ")" },
        { "target": "aliasByNode(movingMedian(scale(nonNegativeDerivative(keepLastValue(" + prefix + "[[instance]].swap.swap_io-out,10),0),-1),'5min')," +(idx+3)+ ")" },
      ]
    }
  };

  function panel_collectd_network_octets(title,prefix,intrf){
    intrf = (typeof intrf === "undefined") ? 'interface-eth0' : intrf;
    var idx = len(prefix);
    return {
      title: title + ', ' + intrf,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: null},
      lines: true,
      fill: 1,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(movingMedian(nonNegativeDerivative(keepLastValue(" + prefix + "[[instance]]." + intrf + ".if_octets.rx,10),0),'5min')," +(idx+4)+ ")" },
        { "target": "aliasByNode(movingMedian(scale(nonNegativeDerivative(keepLastValue(" + prefix + "[[instance]]." + intrf + ".if_octets.tx,10),0),-1),'5min')," +(idx+4)+ ")" }
      ]
    }
  };

  function panel_collectd_network_packets(title,prefix,intrf){
    intrf = (typeof intrf === "undefined") ? 'interface-eth0' : intrf;
    var idx = len(prefix);
    return {
      title: title + ', ' + intrf,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: null},
      lines: true,
      fill: 1,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(movingMedian(nonNegativeDerivative(keepLastValue(" + prefix + "[[instance]]." + intrf + ".if_packets.rx,10),0),'5min')," +(idx+4)+ ")" },
        { "target": "aliasByNode(movingMedian(scale(nonNegativeDerivative(keepLastValue(" + prefix + "[[instance]]." + intrf + ".if_packets.tx,10),0),-1),'5min')," +(idx+4)+ ")" }
      ]
    }
  };

  function panel_collectd_df(title,prefix,vol){
    vol = (typeof vol === "undefined") ? 'df-root' : vol;
    var idx = len(prefix);
    return {
      title: title + ', ' + vol,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0, leftMin: 0},
      lines: true,
      fill: 1,
      linewidth: 2,
      stack: true,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(" + prefix + "[[instance]]." + vol + ".df_complex-{free,used,reserved}," +(idx+3)+ ")" },
      ],
      aliasColors: {
        "df_complex-used": "#447EBC",
        "df_complex-free": "#508642",
        "df_complex-reserved": "#EAB839"
      }
    }
  };

  function panel_collectd_disk(title,prefix,vol){
    vol = (typeof vol === "undefined") ? 'df-root' : vol;
    var idx = len(prefix);
    return {
      title: title + ', ' + vol,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: null},
      lines: true,
      fill: 1,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(nonNegativeDerivative(" + prefix + "[[instance]]." + vol + ".disk_ops.write,10)," +(idx+2)+ "," +(idx+4)+ ")" },
        { "target": "aliasByNode(scale(nonNegativeDerivative(" + prefix + "[[instance]]." + vol + ".disk_ops.read,10),-1)," +(idx+2)+ "," +(idx+4)+ ")" }
      ],
      aliasColors: {
        "df_complex-used": "#447EBC",
        "df_complex-free": "#508642",
        "df_complex-reserved": "#EAB839"
      }
    }
  };

  // jmxtrans 

  function panel_jvm_heap(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0},
      lines: true,
      fill: 1,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(" + prefix + "memory.HeapMemoryUsage_{used,max}," +(idx+2)+ ")" },
      ],
      aliasColors: {
        "HeapMemoryUsage_used": "#508642",
        "HeapMemoryUsage_max": "#890F02"
      }
    }
  };

  function panel_jvm_old_gen_size(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0, leftMin: 0},
      lines: true,
      fill: 1,
      linewidth: 2,
      stack: true,
      nullPointMode: "null",
      tooltip: {
        value_type: "individual",
        query_as_alias: true
      },
      targets: [
        { "target": "aliasByNode(movingMedian(" + prefix + "memorypool.*OldGen.Usage_used,'15min')," +(idx+2)+ "," +(idx+3)+ ")" },
        { "target": "aliasByNode(movingMedian(" + prefix + "memorypool.*EdenSpace.Usage_used,'15min')," +(idx+2)+ "," +(idx+3)+ ")"},
      ]
    }
  };

  function panel_jvm_perm_gen_size(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["bytes"],
      grid: {max: null, min: 0, leftMin: 0},
      lines: true,
      fill: 1,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(movingMedian(" + prefix + "memorypool.*PermGen.Usage_{used,max},'15min')," +(idx+2)+ "," +(idx+3)+ ")"},
      ],
      aliasColors: {
        "PermGen.Usage_max": "#890F02",
        "PSPermGen.Usage_max": "#890F02"
      }
    }
  };

  function panel_jvm_gc_time(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["ms"],
      grid: {max: null, min: 0, leftMin: 0},
      lines: true,
      fill: 0,
      linewidth: 1,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(nonNegativeDerivative(" + prefix + "gc.*.CollectionTime,10)," +(idx+2)+ ")"},
      ]
    }
  };

  function panel_jvm_gc_invoked(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0, leftMin: 0},
      lines: false,
      bars: true,
      fill: 0,
      linewidth: 1,
      nullPointMode: "null",
      targets: [
        { "target": "aliasByNode(nonNegativeDerivative(" + prefix + "gc.*.CollectionCount,10)," +(idx+2)+ ")"},
      ]
    }
  };

  function panel_jetty_threads(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["none"],
      grid: {max: null, min: 0, leftMin: 0},
      fill: 0,
      line: true,
      linewidth: 1,
      nullPointMode: "null",
      targets: [
        { "target": "alias(" + prefix + "jetty_threads.threads,'total')" },
        { "target": "alias(" + prefix + "jetty_threads.idleThreads,'idle')" },
        { "target": "alias(" + prefix + "jetty_threads.minThreads,'min')" },
        { "target": "alias(" + prefix + "jetty_threads.maxThreads,'max')" },
        { "target": "alias(diffSeries(" + prefix + "jetty_threads.threads," + prefix + "jetty_threads.idleThreads),\"busy\")"}
      ]       
    }
  };

  function panel_jetty_threads_ratio(title,prefix){
    var idx = len(prefix);
    return {
      title: title,
      type: 'graphite',
      span: arg_span,
      y_formats: ["short","short"],
      grid: {max: null, min: 0, leftMin: 0, rightMin:0},
      fill: 0,
      line: true,
      linewidth: 2,
      nullPointMode: "null",
      targets: [
        { "target": "alias(diffSeries(" + prefix + "jetty_threads.threads," + prefix + "jetty_threads.idleThreads),\"busy\")" },
        { "target": "alias(scale(divideSeries(diffSeries(" + prefix + "jetty_threads.threads," + prefix + "jetty_threads.idleThreads)," + prefix + "jetty_threads.maxThreads),100),\"ratio busy/max %\")" }
      ],
      aliasYAxis: {
        "busy": 2
      }
    }
  };

  /*
    row templates
  */

  function row_delimiter(title){
    return {
      title: "_____ " + title,
      height: "20px",
      collapse: false,
      editable: false,
      collapsable: false,
      panels: [{
        title: title,
        editable: false,
        span: 12,
        type: "text",
        mode: "text"
      }]
    }
  };

  function row_jvm(title,prefix){
    return {
      title: title,
      height: "250px",
      collapse: true,
      panels: [
        panel_jvm_heap('JVM Heap',prefix),
        panel_jvm_old_gen_size('Old/New Gen usage',prefix),
        panel_jvm_perm_gen_size('Perm Gen usage',prefix),
        panel_jvm_gc_time('GC time, sec',prefix),
        panel_jvm_gc_invoked('GC invocations',prefix),
      ]
    }
  };    

  function row_jetty(title,prefix){
    return {
      title: title,
      height: "250px",
      collapse: true,
      panels: [
        panel_jetty_threads('jetty threads',prefix),
        panel_jetty_threads_ratio('busy/max threads ratio, %',prefix),
      ]
    }
  };

  function row_cpu_memory(title,prefix){
    return {
      title: title,
      height: '250px',
      collapse: false,
      panels: [
        panel_collectd_cpu('CPU, %',prefix),
        panel_collectd_memory('Memory',prefix),
        panel_collectd_loadavg('Load avg, 10min',prefix)
      ]
    }
  };

  function row_swap(title,prefix){
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: [
        panel_collectd_swap_size('Swap size',prefix),
        panel_collectd_swap_io('Swap IO',prefix),
      ]
    }
  };

  function row_network(title,prefix,filter){
    var interfaces = find_filter_values(filter + '.interface-*');
    var panels_network = [];
    for (var i in interfaces) {
      panels_network.push(
            panel_collectd_network_octets('network octets',prefix,interfaces[i]),
            panel_collectd_network_packets('network packets',prefix,interfaces[i])
        );
    };
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: panels_network
    }
  };

  function row_disk_space(title,prefix,filter){
    var volumes = find_filter_values(filter + '.df-*');
    panels_disk_space = [];
    for (var i in volumes) {
      panels_disk_space.push(panel_collectd_df('disk space',prefix,volumes[i]));
    };
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: panels_disk_space
    }
  };

  function row_disk_usage(title,prefix,filter){
    var volumes = find_filter_values(filter + '.disk-*');
    var panels_disk_usage = [];
    for (var i in volumes) {
      panels_disk_usage.push(panel_collectd_disk('disk ops read/write',prefix,volumes[i]));
    };
    return {
      title: title,
      height: '250px',
      collapse: true,
      panels: panels_disk_usage
    }
  };



return function(callback) {

  // Setup some variables
  var dashboard;
 
  /* prefix - depends on actual Graphite tree. 
              In my case it depends on environment which can be passed as argument too.
      .collectd.hosts.
      .statsd.hosts.
      .jmxtrans.hosts.
  */

  var prefix = arg_env + '.collectd.hosts.';
   
  var arg_filter = prefix + arg_i;

  // set filter
  var dashboard_filter = {
    time: {
      from: "now-" + arg_from,
      to: "now"
    },
    list: [
      get_filter_object("instance",arg_filter,false)
      ]
  };

  // define pulldowns
  pulldowns = [
    {
      type: "filtering",
      collapse: false,
      notice: false,
      enable: true
    },
    {
      type: "annotations",
      enable: false
    }
  ];

  // Intialize a skeleton with nothing but a rows array and service object

  dashboard = {
    rows : [],
    services : {}
  };
  dashboard.title = arg_i + ' (' + arg_env + ')';
  dashboard.editable = true;
  dashboard.pulldowns = pulldowns;
  dashboard.services.filter = dashboard_filter;


  // custom dashboard rows (appended to the default dashboard rows)

  var optional_rows = [];


  // If there are any JMX metrics available for this host - append them to dashboard

  var proc_metrics = expand_filter_values(arg_env + '.jmxtrans.hosts.' + arg_i + '.proc.*.jmx');

  for (var m in proc_metrics) {

    proc_name = proc_metrics[m].split('.')[5];

    var jmx_prefix = arg_env + '.jmxtrans.hosts.[[instance]].proc.' + proc_name + '.jmx.';

    optional_rows.push(
                row_delimiter(proc_name),
                row_jvm('JVM Heap',jmx_prefix)
              );

    var jetty_metric = find_filter_values(arg_env + '.jmxtrans.hosts.' + arg_i + '.proc.' + proc_name + '.jmx.jetty_threads');

    if (jetty_metric.length > 0) {
      optional_rows.push(row_jetty('Jetty',jmx_prefix));
    };
  
  };

  $.ajax({
    method: 'GET',
    url: '/'
  })
  .done(function(result) {

    // costruct dashboard rows
    
    dashboard.rows.push(
                      row_cpu_memory('cpu, memory',prefix),
                      row_swap('swap',prefix),
                      row_network('network',prefix,arg_filter),
                      row_disk_space('disk space',prefix,arg_filter),
                      row_disk_usage('disk ops',prefix,arg_filter)
                    );

    // custom rows
    for (var i in optional_rows){
      dashboard.rows.push(optional_rows[i]);
    };

    // when dashboard is composed call the callback
    // function and pass the dashboard
    callback(dashboard);
  });
}