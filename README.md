cli-head makes it easy to create cli scripts. it uses [nopt](https://www.npmjs.com/package/nopt) for Process argument parsing.
It lets you wrap every nopt option (a noption, if you will) with a config object that allows you to:
-	Set default value for the noption
-	Add noption description, for help menu
-	Mark noption as required, fail command with help if not satisfied

Additionally, it lets you set the following command level options:
-	Declare that the command requires additional args (remain)
-	Declare a function to transform remaining args
-	Declare onBeforeStart, onBeforeClose middlewares to the command
-	Declare the command handler

It also automatically configures [chillogger](https://www.npmjs.com/package/chillogger) to for easy printing in 3 different levels of verbosity based on command line args as follows:
-   default: (chillogger defaults) level 3 (info), no trace and verbosity 0
-   -v, verbose: level 3 (info), with trace and verbosity 1
-   -vv, very-verbose: level 4 (debug), with trace and verbosity 2


So, with cli-head, command line programs be like:
```js
//main.js
const {loadCommandsDir, addCommand, runProgram} = require("../cli-head");
const {join} = require("path")

loadCommandsDir(join(__dirname,"commands"))
runProgram()
```

And in your commands directory:
```js
const path = require("path");
const Logger = require("chillogger");
const log = new Logger("example1");

module.exports = [
    {
        name: "example1",
        options: [
            {
                name: "path",
                description: "options are parsed with nopt",
                noption: path,
            },
            {
                name: "number",
                description: "can mark as required, and assign default value; will be multiplied by 1000",
                noption: Number,
                required: true,
                default: 2,
                transform: (v)=>v*1000
            }
        ],
        remain: {
            name: "requiredReamin",
            required: true,
            transform: value => ({
                custom:"parsing of remain",
                value:  value            })
        },
        description: "an example command",
        onBeforeStart: (args)=>{
            log.time("total");
            log.debug("OnBefore Run example1", args)
            args.addedInOnBeforeStart = "added"
            return args
        },
        handler: (args) => {
            log.info("Runnin example2. will return a random in 2 seconds");
            return new Promise((resolve, reject)=>{
                setTimeout(()=>{
                    resolve(Math.random())
                }, 2000)
            })
        },
        onBeforeClose: (results, args)=>{
            log.info("finishing with onBeforeClose", {results}, args);
            log.timeEnd("total");
        },
        
    },
]
```