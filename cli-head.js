const Logger = require("chillogger");
// const [image, scriptPath, ...args] = process.argv;
const { readdirSync } = require("fs");
const { join } = require("path");
const { EOL } = require("os");
var nopt = require("nopt");

const noptions = {
  "help": Boolean
}
const shortHands = {
  "v": ["--verbose"],
  "vv": ["--very-verbose"]
}

const globalOptions = [
  { name: "help", description: "Shows this" },
  { name: "verbose", description: "Be verbose, I'll tell you more about what's happening" },
  { name: "very-verbose", description: "Be very verbose, I'll tell you everything i know", short: "vv" }
]

const parsed = nopt(noptions, shortHands, process.argv, 2)
switch (true) {
  case parsed["very-verbose"]:
    Logger.setGlobalTrace(true);
    Logger.setGlobalLevel(4);
    Logger.setGlobalVerbosity(2);
    break;
  case parsed["verbose"]:
    Logger.setGlobalTrace(true);
    Logger.setGlobalLevel(3);
    Logger.setGlobalVerbosity(1);
    break;
  default:
    break;
}

const log = new Logger("Main");

const _colors = {
  WHITE: "\u001b[1;40;37m",
  RESET: "\u001b[0m",
  DEFAULT: "\u001b[0m\u001b[1m",
  GRAY: "\u001b[0;40;37m",
  DARK_GRAY: "\u001b[1;40;30m",
  RED: "\u001b[1;40;31m",
  DARK_RED: "\u001b[0;40;31m",
  GREEN: "\u001b[1;40;32m",
  DARK_GREEN: "\u001b[0;40;32m",
  BLUE: "\u001b[1;40;34m",
  PURPLE: "\u001b[1;40;35m",
  TURQUOISE: "\u001b[1;40;36m",
  DARK_TURQUOISE: "\u001b[0;40;36m",
  YELLOW: "\u001b[1;40;33m",
  DARK_YELLOW: "\u001b[0;40;33m"
};

const color = function (input, _color) {
  if (_color === -1) return "";
  _color = _color || "DEFAULT";
  return _colors[_color.toUpperCase()] + input + _colors.RESET;
};


const printOption = (option) => {
  const short = option.short || option.name.toLowerCase().substr(0, 1);
  let type;
  switch (typeof (option.noption)) {
    case "function":
      type = `{${option.noption.name.toLowerCase()}}`
      break;
    case "object":
      type = "{path}"
      break;
    default:
      type = ""
      break;
  }
  const padLength = 35 - (`   --${option.name}, -${short} ${type}${option.required ? "*" : ""}`).length;
  console.log(`   ${color(`--${
    option.name.toLowerCase()
    }, -${short}`, "DARK_TURQUOISE")} ${color(type, "yellow")}${option.required ? color("*", "TURQUOISE") : ""}${
    (" ").repeat(padLength)
    }${option.description}`);
}

const commandUsageLine = (command) => {
  const padLength = 30 - (command.name.length + 3 + command.remain ? command.remain.name.length : 0);
  return color(command.name, "DARK_TURQUOISE") +
    " " +
    color(
      command.remain ?
        command.remain.required ?
          `<${command.remain.name}>` :
          `[${command.remain.name}]`
        :
        " ",
      command.remain && command.remain.required ? "yellow" : "gray"
    ) +
    " ".repeat(padLength) +
    command.description;
}

const help = (error, command) => {
  if (error) console.log(color(EOL + error, `red`))
  if (command) {
    console.log(`${EOL}Usage: ${commandUsageLine(command)}`)
    console.log(`${EOL}${color("Options", "yellow")}`)
    globalOptions.forEach(option => printOption(option));
    (command.options || []).forEach(option => printOption(option))
  }
  else {
    console.log(`${EOL}Usage: ${color("node cli.js", "gray")} ${color("<command>", "yellow")} ${color("[options]", "green")}`)
    console.log(`${EOL}${color("Global Options", "yellow")}`)
    globalOptions.forEach(option => printOption(option))
    console.log(`${EOL}${color("Commands", "yellow")}`)
    Object.keys(commands).forEach(commandName => console.log(`   ${commandUsageLine(commands[commandName])}`))
  }
  process.exit()
}


const promiseWrap = (v) => v instanceof Promise ? v : Promise.resolve(v)

const commands = {}
module.exports = {
  loadCommandsDir: (dirPath = join(process.cwd(), "commands")) => {
    try {
      readdirSync(dirPath).forEach(commandMoudleName => {
        try {
          const _commands = require(join(dirPath, commandMoudleName));
          _commands.forEach(cmd => {
            cmd.noptions = {};
            cmd.options.forEach(o => cmd.noptions[o.name] = o.noption)
            commands[cmd.name] = cmd
          })
        } catch (error) {
          log.error(error)
        }
      })
    } catch (error) {
      log.error(error)
    }
  },
  addCommand: (cmd) => commands[cmd.name] = cmd,
  runProgram: () => {
    var remain = parsed.argv.remain.concat()
    let _tryCmd = remain.shift();
    let cmds = Object.keys(commands).filter(cmd => cmd.startsWith(_tryCmd))

    if (parsed.help || !cmds.length) {
      help();
      process.exit();
    }

    if (cmds.length > 1) {
      console.log(`${EOL}Not sure what you mean when you say ${color(_tryCmd, "yellow")}${EOL}What i have is:`)
      cmds.forEach(commandName => console.log(`   ${commandUsageLine(commands[commandName])}`))
      process.exit();
    }

    let selectedCommand = commands[cmds.pop()];
    const commandArgs = nopt(selectedCommand.noptions, {}, process.argv, 3)

    if (selectedCommand.remain) {
      commandArgs.argv.$$remain = (selectedCommand.remain.transform || (() => { }))(commandArgs.argv.remain)
    }

    if ((commandArgs.argv.$$remain instanceof Object) && !(commandArgs.argv.$$remain instanceof Array)) {
      Object.assign(commandArgs, commandArgs.argv.$$remain)
    }

    if (selectedCommand.remain && selectedCommand.remain.required && !commandArgs.argv.remain.length) {
      help(`${selectedCommand.remain.name} is required!`, selectedCommand)
      process.exit();
    }

    selectedCommand.options.forEach((option) => {
      if (option.default && typeof (commandArgs[option.name]) === "undefined") commandArgs[option.name] = option.default;
      if (option.required && typeof (commandArgs[option.name]) === "undefined") {
        help(`${option.name} is required!`, selectedCommand)
      }
    })

    const {
      onBeforeStart = (args) => Promise.resolve(args),
      handler = () => (args) => Promise.resolve(),
      onBeforeClose = () => Promise.resolve(),
    } = selectedCommand;

    process
      .on('unhandledRejection', (reason, p) => {
        console.log(color(reason.stack, "dark_red"));
        console.log(color(`program failed with unhandled error`, "red"));
        process.exit(1);
      })
      .on('uncaughtException', (error) => {
        if (!(error instanceof Error)) {
          error = new Error(`command throws none-Error error "${error}"`)
        }
        console.log(color(error.stack, "dark_red"));
        console.log(color(`program failed with unhandled error`, "red"));
        process.exit(1);
      });

    promiseWrap(onBeforeStart(commandArgs))
      .then(_args => promiseWrap(handler(_args || commandArgs)).then((res) => onBeforeClose(res, _args || commandArgs)))

  }
}