import { Position, Range, Location } from 'vscode-languageserver-types';
import { parseLine } from './parser';

export type ColangEntityType = "user" | "bot" | "flow" | "subflow" | "variable";
export type ColangEntityVariable = {
    name: string;
    range: Range;
}
export type ColangDocumentLineType = "define" | "user" | "bot" | "flow" | "do" | "message" | "comment" | "if" | "when" | "variable" | "unknown";
export type ColangDocumentPositionData = {
    entityType?: ColangEntityType;
    entityName?: string;
}


export class ColangDocument {
    readonly uri: string;
    readonly lines: ColangDocumentLine[];

    constructor(uri: string, text: string ) {
        this.uri = uri;
        this.lines = this.parse(text);
    }

    getPositionData(position: Position): ColangDocumentPositionData {
        const line = this.lines[position.line];

        if (line) {
            return line.getPositionData(position.character);
        }
        return {};
    }

    getDefinition(entityType: ColangEntityType, entityName: string): Location | undefined {
        const lineDefine = this.lines.find(line => {
            const lineDefine = line.lineType === "define" ? line as ColangDocumentLineDefine : null;
            return lineDefine?.entityType === entityType && lineDefine?.entityName === entityName;
        }) as ColangDocumentLineDefine | undefined;

        if (lineDefine?.entityNameRange) {
            return Location.create(this.uri, lineDefine.entityNameRange);
        } else {
            return undefined;
        }
    }

    getReferences(entityType: ColangEntityType, entityName: string): Location[] {
        const locations: Location[] = [];
        this.lines.forEach(line => locations.push(...line.getReferences(entityType, entityName).map(range => Location.create(this.uri, range))));
        return locations;
    }

    private parse(text: string): ColangDocumentLine[] {
        return text.split("\n").map((line, lineNumber) => parseLine(line, lineNumber));
    }
}

export interface ColangDocumentLine {
    readonly lineType: ColangDocumentLineType;
    getPositionData(character: number): ColangDocumentPositionData;
    getReferences(entityType: ColangEntityType, entityName: string): Range[];
}

export class ColangDocumentLineDefine implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "define";
    entityType?: ColangEntityType;
    entityName?: string;
    entityNameRange?: Range;

    getPositionData(_character: number): ColangDocumentPositionData {
        return {
            entityType: this.entityType,
            entityName: this.entityName
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return this.entityType === entityType && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }
}

export class ColangDocumentLineUser implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "user";
    entityName?: string;
    entityNameRange?: Range;

    getPositionData(_character: number): ColangDocumentPositionData {
        return {
            entityType: "user",
            entityName: this.entityName
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return entityType === "user" && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }
}

export class ColangDocumentLineBot implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "bot";
    entityName?: string;
    entityNameRange?: Range;

    getPositionData(_character: number): ColangDocumentPositionData {
        return {
            entityType: "bot",
            entityName: this.entityName
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return entityType === "bot" && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }
}

export class ColangDocumentLineDo implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "do";
    entityName?: string;
    entityNameRange?: Range;

    getPositionData(_character: number): ColangDocumentPositionData {
        return {
            entityType: "subflow",
            entityName: this.entityName
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return entityType === "subflow" && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }
}

export class ColangDocumentLineMessage implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "message";
    variables?: ColangEntityVariable[];

    getPositionData(character: number): ColangDocumentPositionData {
        const variable = this.variables?.find(v => v.range.start.character <= character && character <= v.range.end.character);
        if (variable) {
            return {
                entityType: "variable",
                entityName: variable.name
            }
        }
        return {};
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {

        if (entityType === "variable" && this.variables) {
            return this.variables.filter(variable => variable.name === entityName).map(variable => variable.range);
        }
        return [];
    }
}

export class ColangDocumentLineComment implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "comment";

    getPositionData(character: number): ColangDocumentPositionData {
        return {};
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return [];
    }
}

export class ColangDocumentLineIf implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "if";
    variables?: ColangEntityVariable[];

    getPositionData(character: number): ColangDocumentPositionData {
        const variable = this.variables?.find(v => v.range.start.character <= character && character <= v.range.end.character);
        if (variable) {
            return {
                entityType: "variable",
                entityName: variable.name
            }
        }
        return {};
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {

        if (entityType === "variable" && this.variables) {
            return this.variables.filter(variable => variable.name === entityName).map(variable => variable.range);
        }
        return [];
    }
}

export class ColangDocumentLineWhen implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "when";
    entityType?: "user";
    entityName?: string;
    entityNameRange?: Range;
    else: boolean = false;

    getPositionData(character: number): ColangDocumentPositionData {
        return {
            entityType: this.entityType,
            entityName: this.entityName
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return this.entityType === entityType && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }

    // Override the toString() method
    toString() {
        return `!: when...`;
    }
}

export class ColangDocumentLineVariable implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "variable";
    name?: string;
    nameRange?: Range;
    variables?: ColangEntityVariable[];
    
    getPositionData(character: number): ColangDocumentPositionData {

        if (this.nameRange && this.nameRange.start.character <= character && character <= this.nameRange.end.character) {
            return {
                entityType: "variable",
                entityName: this.name
            }
        }

        const variable = this.variables?.find(v => v.range.start.character <= character && character <= v.range.end.character);
        if (variable) {
            return {
                entityType: "variable",
                entityName: variable.name
            }
        }

        return {};
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        const ranges: Range[] = [];

        if (entityType === "variable") {

            if (this.name === entityName && this.nameRange) {
                ranges.push(this.nameRange);
            }
            
            if (this.variables) {
                ranges.push(...this.variables.filter(variable => variable.name === entityName).map(variable => variable.range));
            }
        }

        return ranges;
    }
}

export class ColangDocumentLineUnknown implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "unknown";
    line: string = "";
    
    constructor(line: string) {
        this.line = line;
    }

    getPositionData(character: number): ColangDocumentPositionData {
        return {};
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return [];
    }
}