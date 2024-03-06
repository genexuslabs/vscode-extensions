import { Position, Range } from 'vscode-languageserver-types';
import { 
    ColangDocumentLine,
    ColangDocumentLineBot,
    ColangDocumentLineComment,
    ColangDocumentLineDefine,
    ColangDocumentLineDo,
    ColangDocumentLineElse,
    ColangDocumentLineIf,
    ColangDocumentLineMessage,
    ColangDocumentLineUnknown,
    ColangDocumentLineUser,
    ColangDocumentLineVariable,
    ColangDocumentLineWhen,
    ColangEntityType
} from './document';

type LineMatcher = {
    id: "define" | "user" | "bot" | "do" | "message" | "comment" | "if" | "else" | "when" | "variable";
    regex: RegExp;
};

const rules: LineMatcher[] = [
    {id: "define", regex: /^\s*define(?:\s+(user|bot|flow|subflow)(?:\s+(.*)))?/},
    {id: "user", regex: /^\s*user(?:\s+(.*))?/},
    {id: "bot", regex: /^\s*bot(?:\s+(.*))?/},
    {id: "do", regex: /^\s*do(?:\s+(.*))?/},
    {id: "message", regex: /^\s*"/},
    {id: "comment", regex: /^\s*#(?:\s*(.*))?/},
    {id: "if", regex: /^\s*if(?:\s+(.*))?/},
    {id: "else", regex: /^\s*else(?:\s+(when)(?:\s+(.*))?)?/},
    {id: "when", regex: /^\s*(?:else\s+)?when(?:\s+(user)(?:\s+(.*))?)?/},
    {id: "variable", regex: /^\s*\$(?:([^=\s]+)(\s*=(.*)?)?)?/}
];

export function parseLine(line: string, lineNumber: number): ColangDocumentLine {
    const { lineMatcher, matches } = matchLine(line);

    switch(lineMatcher?.id ?? "") {
    case "define":
        return parseLineDefine(line, lineNumber, matches);
    case "user":
        return parseLineUser(line, lineNumber, matches);
    case "bot":
        return parseLineBot(line, lineNumber, matches);
    case "do":
        return parseLineDo(line, lineNumber, matches);
    case "message":
        return parseLineMessage(line, lineNumber, matches);
    case "comment":
        return parseLineComment(line, lineNumber, matches);
    case "if":
        return parseLineIf(line, lineNumber, matches);        
    case "else":
        return parseLineElse(line, lineNumber, matches);        
    case "when":
        return parseLineWhen(line, lineNumber, matches);        
    case "variable":
        return parseLineVariable(line, lineNumber, matches);
    default:
        return new ColangDocumentLineUnknown(line);
    }
}

function matchLine(line: string): {lineMatcher?: LineMatcher, matches: RegExpMatchArray} {
    for (const rule of rules) {
        const matches = line.match(rule.regex);
        if (matches) {
            return {
                lineMatcher: rule,
                matches
            };
        }
    }

    return {
        lineMatcher: undefined,
        matches: [""]
    };
}

function parseLineDefine(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineDefine {
    const lineDefine = new ColangDocumentLineDefine();

    lineDefine.entityType = matches[1] as ColangEntityType;
    lineDefine.entityName = matches[2];

    if (lineDefine.entityName) {
        const entityNameIndex = line.lastIndexOf(lineDefine.entityName);

        lineDefine.entityNameRange = Range.create(
            Position.create(lineNumber, entityNameIndex),
            Position.create(lineNumber, entityNameIndex + lineDefine.entityName.length)
        );    
    }

    return lineDefine;
}

function parseLineUser(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineUser {
    const lineUser = new ColangDocumentLineUser();

    lineUser.entityName = matches[1];

    if (lineUser.entityName) {
        const entityNameIndex = line.lastIndexOf(lineUser.entityName);

        lineUser.entityNameRange = Range.create(
            Position.create(lineNumber, entityNameIndex),
            Position.create(lineNumber, entityNameIndex + lineUser.entityName.length)
        );    
    }

    return lineUser;
}

function parseLineBot(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineBot {
    const lineBot = new ColangDocumentLineBot();

    lineBot.entityName = matches[1];

    if (lineBot.entityName) {
        const entityNameIndex = line.lastIndexOf(lineBot.entityName);

        lineBot.entityNameRange = Range.create(
            Position.create(lineNumber, entityNameIndex),
            Position.create(lineNumber, entityNameIndex + lineBot.entityName.length)
        );     
    }

    return lineBot;
}

function parseLineDo(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineDo {
    const lineDo = new ColangDocumentLineDo();

    lineDo.entityName = matches[1];

    if (lineDo.entityName) {
        const entityNameIndex = line.lastIndexOf(lineDo.entityName);

        lineDo.entityNameRange = Range.create(
            Position.create(lineNumber, entityNameIndex),
            Position.create(lineNumber, entityNameIndex + lineDo.entityName.length)
        );     
    }

    return lineDo;
}

function parseLineMessage(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineMessage {
    const lineMessage = new ColangDocumentLineMessage();

    // TODO: lineMessage.variables

    return lineMessage;
}

function parseLineIf(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineIf {
    const lineIf = new ColangDocumentLineIf();

    // TODO: lineIf.variables

    return lineIf;
}

function parseLineElse(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineElse {
    const lineElse = new ColangDocumentLineElse();

    // TODO: lineElse.when

    return lineElse;
}

function parseLineWhen(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineWhen {
    const lineWhen = new ColangDocumentLineWhen();

    // TODO:

    return lineWhen;
}

function parseLineComment(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineComment {
    return new ColangDocumentLineComment();
}

function parseLineVariable(line: string, lineNumber: number,  matches: RegExpMatchArray): ColangDocumentLineVariable {
    const lineVariable = new ColangDocumentLineVariable();

    lineVariable.name = matches[1];

    if (lineVariable.name) {
        const variableNameIndex = line.indexOf(lineVariable.name);
        
        lineVariable.nameRange = Range.create(
            Position.create(lineNumber, variableNameIndex),
            Position.create(lineNumber, variableNameIndex + lineVariable.name.length)
        );    
    }
    // TODO: lineVariable.variables

    return lineVariable;
}
