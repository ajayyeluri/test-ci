var request = require("request");
var myArgs = process.argv.slice(2);
var proto = myArgs[0];
var https;
if(proto === "https")
  https = require("https");
else
  https = require ("http");
var fs = require("fs");

//Call Mgmt API
function mgmtAPI(host, port, path, auth, methodType){
  return new Promise(function (fulfill, reject){
  var data = "";
  //var auth = Buffer.from(username+":"+password).toString('base64');
    var options = {
      host: host,
      port: port,
      path: path,
      method: methodType,
      headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic "+auth
      }
    };
    var req = https.request(options, function(res) {
      if (res.statusCode >= 400 && res.statusCode <= 499) {
        var maskedOptions = options;
        maskedOptions.headers.Authorization = "***";
        console.error(res.statusCode + ": " + res.statusMessage + " with " + JSON.stringify(maskedOptions));
        //throw new Error(res.statusCode + ": " + res.statusMessage + " with " + JSON.stringify(maskedOptions));
      }
      if (res.statusCode >= 500) {
        var maskedOptions = options;
        maskedOptions.headers.Authorization = "***";
        console.error(res.statusCode + ": " + res.statusMessage + " with " + JSON.stringify(maskedOptions));
      }
      res.on("data", function(d) {
          data += d;
      });
      res.on("end", function(){
        if(data!= "" && options.headers["Content-Type"]==="application/json"){
          fulfill(JSON.parse(data));
        }
        else {
          fulfill(data);
        }
      });
    });

    req.on("error", function(e) {
      console.error(e);
    });

    req.end();
  });
}

function getMgmtAPI(host, port, path, auth){
  return mgmtAPI(host, port, path, auth, "GET");
}

function getDeployedRevisionForAPI(host, port, org, env, auth, api){
  return getMgmtAPI(host, port, "/v1/o/"+org+"/e/"+env+"/apis/"+api+"/deployments", auth)
    .then(function(response){
      //console.log(JSON.stringify(response));
      var revision=-1;
      if(response!=null && response.revision!=null && response.revision.length>0){
        revision = response.revision[0].name;
      }
      return revision;
  })
  .catch(function(e){
    console.error("Catch handler getDeployedRevisionForAPI" + e);
    return null;
  });
}

var exportBundle = function(proto, host, port, org, env, auth, api){
  getDeployedRevisionForAPI(host, port, org, env, auth, api)
    .then(function(revNumber){
      if(revNumber === -1){
        console.error("Error has occured");
        return null;
      }
      console.log("Revision Number is : "+ revNumber);
      var uri = proto+"://"+host+":"+port+"/v1/o/"+org+"/apis/"+api+"/revisions/"+revNumber+"?format=bundle";
      var options = {
        url: uri,
        headers: {
          "Authorization": "Basic "+ auth
        }
      }
      request.get(options)
        //If you want response, uncomment below code
        //.on('response', function(response) {
          //console.log(JSON.stringify(response)); 
        //})
        .pipe(fs.createWriteStream(api+".zip"));
      console.log("Export complete !!!")
    })
    .catch(function(e){
        console.error("Not a valid API Proxy Name or the Proxy is not deployed"+e);
        return null;
      });
};

exportBundle(myArgs[0], myArgs[1], myArgs[2], 
        myArgs[3], myArgs[4], 
        myArgs[5], 
        myArgs[6]);

//TO run
//node downloadProxy.js protocol host port org env auth api

