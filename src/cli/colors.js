"use strict";
// override commander help formatting functions
// to include color styling in the output
// so the CLI looks nice
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
// Extend the colors command class to include
// a depth function that returns the depth of the command.
class ColorsCommand extends commander_1.Command {
}
const colors = [
    // depth = 0, top-level command
    { command: 'yellow', option: 'cyan', arg: 'magenta' },
    // depth = 1, second-level commands
    { command: 'green', option: 'blue', arg: 'red' },
    // depth = 2, third-level commands
    { command: 'yellow', option: 'cyan', arg: 'magenta' },
    // depth = 3 fourth-level commands
    { command: 'green', option: 'blue', arg: 'red' },
];
function humanReadableArgName(arg) {
    const nameOutput = arg.name() + (arg.variadic === true ? '...' : '');
    return arg.required ? `<${nameOutput}>` : `[${nameOutput}]`;
}
function getControlCharacterSpaces(term) {
    const matches = term.match(/.\[\d+m/g);
    return matches ? matches.length * 5 : 0;
}
// get depth of command
// 0 = top, 1 = subcommand of top, etc
ColorsCommand.prototype.depth = function () {
    if (this._depth === undefined) {
        let depth = 0;
        let { parent } = this;
        while (parent) {
            depth += 1;
            parent = parent.parent;
        }
        this._depth = depth;
    }
    return this._depth;
};
const colorsMod = {
    commandUsage(cmd) {
        const depth = cmd.depth();
        // Usage
        let cmdName = cmd.name();
        if (cmd.aliases()[0]) {
            cmdName = `${cmdName}|${cmd.aliases()[0]}`;
        }
        let parentCmdNames = '';
        let parentCmd = cmd.parent;
        let parentDepth = depth - 1;
        while (parentCmd) {
            const chalkColor = chalk_1.default[colors[parentDepth].command];
            const parentCmdName = parentCmd.name();
            const chalkColorStr = chalkColor(parentCmdName);
            parentCmdNames = `${chalkColorStr} ${parentCmdNames}`;
            parentCmd = parentCmd.parent;
            parentDepth -= 1;
        }
        // from Command.prototype.usage()
        const cmdHelp = cmd.createHelp();
        const cmdOpts = cmdHelp.visibleOptions(cmd);
        const hasHelpOption = cmdOpts.some(option => option.flags === '-h, --help');
        function mapArg(arg) {
            const chalkColor = chalk_1.default[colors[depth].arg];
            const argName = humanReadableArgName(arg);
            return chalkColor(argName);
        }
        const chalkColorOpt = chalk_1.default[colors[depth].option];
        const chalkColorDepth1 = chalk_1.default[colors[depth + 1].command];
        const args = cmdHelp.visibleArguments(cmd).map(mapArg);
        const cmdUsage = [].concat((cmdOpts.length || hasHelpOption ? chalkColorOpt('[options]') : []), (cmd.commands.length ? chalkColorDepth1('[command]') : []), (cmd.args.length ? args : [])).join(' ');
        const chalkColor = chalk_1.default[colors[depth].command];
        return `${parentCmdNames}${chalkColor(cmdName)} ${cmdUsage}`;
    },
    subcommandTerm(cmd) {
        const depth = cmd.depth();
        // Legacy. Ignores custom usage string, and nested commands.
        const cmdHelp = cmd.createHelp();
        const cmdOpts = cmdHelp.visibleOptions(cmd);
        const args = cmdHelp.visibleArguments(cmd).map(arg => humanReadableArgName(arg)).join(' ');
        const CCol = chalk_1.default[colors[depth].command];
        const COpt = chalk_1.default[colors[depth].option];
        const CArg = chalk_1.default[colors[depth].arg];
        return CCol(cmd.name() + (cmd.aliases()[0] ? `|${cmd.aliases()[0]}` : '')) +
            COpt(cmdOpts.length ? ' [options]' : '') + // simplistic check for non-help option
            CArg(args ? ` ${args}` : '');
    },
    longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => Math.max(max, helper.optionTerm(option).length - getControlCharacterSpaces(helper.optionTerm(option))), 0);
    },
    longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => Math.max(max, helper.subcommandTerm(command).length - getControlCharacterSpaces(helper.subcommandTerm(command))), 0);
    },
    longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => Math.max(max, helper.argumentTerm(argument).length - getControlCharacterSpaces(helper.argumentTerm(argument))), 0);
    },
    formatHelp(cmd, helper) {
        const depth = cmd.depth();
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2; // between term and description
        function formatItem(term, description) {
            const padding = ' '.repeat((termWidth + itemSeparatorWidth) - (term.length - getControlCharacterSpaces(term)));
            if (description) {
                const fullText = `${term}${padding}${description}`;
                return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
            }
            return term;
        }
        function formatList(textArray) {
            return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
        }
        // Usage
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ''];
        // Description
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
            output = output.concat([commandDescription, '']);
        }
        // Arguments
        const argHelp = cmd.createHelp();
        function mapArg(arg) {
            const chalkColor = chalk_1.default[colors[depth].arg];
            const argName = argHelp.argumentTerm(arg);
            return formatItem(chalkColor(argName), arg.description);
        }
        const argumentList = helper.visibleArguments(cmd).map(mapArg);
        if (argumentList.length > 0) {
            output = output.concat(['Arguments:', formatList(argumentList), '']);
        }
        // Options
        function mapOpt(opt) {
            const chalkColor = chalk_1.default[colors[depth].option];
            const optTerm = helper.optionTerm(opt);
            const optDesc = helper.optionDescription(opt);
            return formatItem(chalkColor(optTerm), optDesc);
        }
        const optionList = helper.visibleOptions(cmd).map(mapOpt);
        if (optionList.length > 0) {
            output = output.concat(['Options:', formatList(optionList), '']);
        }
        // Commands
        const commandList = helper.visibleCommands(cmd).map(cmd => formatItem(helper.subcommandTerm(cmd), helper.subcommandDescription(cmd)));
        if (commandList.length > 0) {
            output = output.concat(['Commands:', formatList(commandList), '']);
        }
        return output.join('\n');
    },
};
exports.default = colorsMod;
