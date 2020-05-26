const {loadCommandsDir, addCommand, runProgram} = require("../cli-head");
const {join} = require("path")

loadCommandsDir(join(__dirname,"example-commands"))
runProgram()