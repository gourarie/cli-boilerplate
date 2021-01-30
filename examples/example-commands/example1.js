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
                description: "can mark as required, and assign default value",
                noption: Number,
                required: true,
                default: 2,
            },
            {
                name: "transform",
                description: "will multiply by a 1000",
                noption: Number,
                transform:v=>v*1000
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

            log.info("Runnin example2. will return a random in 2 seconds",args);
            return new Promise((resolve, reject)=>{
                setTimeout(()=>{
                    throw "test"
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