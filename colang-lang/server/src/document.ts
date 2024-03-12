import { Position, Range, Location } from 'vscode-languageserver-types';
import { parseLine } from './parser';
import { Diagnostic, DocumentSymbol, SymbolKind, TextEdit, WorkspaceEdit } from 'vscode-languageserver/node';
import { ColangDocumentValidator } from './validator';

export type ColangEntityType = "user" | "bot" | "flow" | "subflow" | "variable";
export type ColangEntityVariable = {
    name: string;
    range: Range;
}
export type ColangDocumentLineType = "define" | "user" | "bot" | "do" | "message" | "comment" | "if" | "when" | "variable" | "unknown";
export type ColangDocumentPositionData = {
    entityType?: ColangEntityType;
    entityName?: string;
    entityNameRange?: Range;
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

    getSymbols(): DocumentSymbol[] {
        const symbols: DocumentSymbol[] = [];

        this.lines.forEach(line => {
            if (line.lineType === "define") {
                const lineDefine = line as ColangDocumentLineDefine;
    
                if (lineDefine.entityName && lineDefine.entityNameRange) {
                    symbols.push({
                        name: lineDefine.entityName,
                        detail: lineDefine.entityType,
                        kind: SymbolKind.Method,
                        range: lineDefine.entityNameRange,
                        selectionRange: lineDefine.entityNameRange,
                        children: []
                    });
                }
            }
        });

        return symbols;
    }

    canRenameSymbol(position: Position): Range | null {
        return this.getPositionData(position).entityNameRange ?? null;
    }

    renameSymbol(symbolPosition: Position, newName: string): WorkspaceEdit | null {
        const renames: TextEdit[] = [];
        const data = this.getPositionData(symbolPosition);

        if (data.entityType && data.entityName) {
            for (const line of this.lines) {
                renames.push(...line.renameSymbol(data.entityType, data.entityName, newName));
            }
        }

        if (renames.length > 0) {
            return {
                changes: {
                    [this.uri]: renames
                }
            }    
        }
        return null;
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

    validate(connection:any): Diagnostic[] {
        return new ColangDocumentValidator(this).validate();
    }

    private parse(text: string): ColangDocumentLine[] {
        return text.split("\n").map((line, lineNumber) => parseLine(line, lineNumber));
    }
}

export interface ColangDocumentLine {
    readonly lineType: ColangDocumentLineType;
    getPositionData(character: number): ColangDocumentPositionData;
    getReferences(entityType: ColangEntityType, entityName: string): Range[];
    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[];
}

export class ColangDocumentLineDefine implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "define";
    entityType?: ColangEntityType;
    entityName?: string;
    entityNameRange?: Range;

    getPositionData(_character: number): ColangDocumentPositionData {
        return {
            entityType: this.entityType,
            entityName: this.entityName,
            entityNameRange: this.entityNameRange
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return this.entityType === entityType && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {

        if (entityType === this.entityType && entityName === this.entityName && this.entityNameRange) {
            return [{newText: newName, range: this.entityNameRange}];
        }
        return [];
    }
}

export class ColangDocumentLineUser implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "user";
    entityName?: string;
    entityNameRange?: Range;

    getPositionData(_character: number): ColangDocumentPositionData {
        return {
            entityType: "user",
            entityName: this.entityName,
            entityNameRange: this.entityNameRange
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return entityType === "user" && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {

        if (entityType === "user" && entityName === this.entityName && this.entityNameRange) {
            return [{newText: newName, range: this.entityNameRange}];
        }
        return [];
    }
}

export class ColangDocumentLineBot implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "bot";
    entityName?: string;
    entityNameRange?: Range;

    getPositionData(_character: number): ColangDocumentPositionData {
        return {
            entityType: "bot",
            entityName: this.entityName,
            entityNameRange: this.entityNameRange
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return entityType === "bot" && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {

        if (entityType === "bot" && entityName === this.entityName && this.entityNameRange) {
            return [{newText: newName, range: this.entityNameRange}];
        }
        return [];
    }
}

export class ColangDocumentLineDo implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "do";
    entityName?: string;
    entityNameRange?: Range;

    getPositionData(_character: number): ColangDocumentPositionData {
        return {
            entityType: "subflow",
            entityName: this.entityName,
            entityNameRange: this.entityNameRange
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return entityType === "subflow" && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {

        if (entityType === "subflow" && entityName === this.entityName && this.entityNameRange) {
            return [{newText: newName, range: this.entityNameRange}];
        }
        return [];
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
                entityName: variable.name,
                entityNameRange: variable.range
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

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {
        const renames: TextEdit[] = [];

        if (entityType === "variable") {
            this.variables?.forEach(variable => {
                if (entityName === variable.name && variable.range ) {
                    renames.push({newText: newName, range: variable.range});
                }    
            });    
        }

        return renames;
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

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {
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
                entityName: variable.name,
                entityNameRange: variable.range
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

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {
        const renames: TextEdit[] = [];

        if (entityType === "variable") {
            this.variables?.forEach(variable => {
                if (entityName === variable.name && variable.range ) {
                    renames.push({newText: newName, range: variable.range});
                }    
            });    
        }

        return renames;
    }
}

export class ColangDocumentLineWhen implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "when";
    entityType?: "user";
    entityName?: string;
    entityNameRange?: Range;
    else?: boolean = false;

    getPositionData(character: number): ColangDocumentPositionData {
        return {
            entityType: this.entityType,
            entityName: this.entityName,
            entityNameRange: this.entityNameRange
        };
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return this.entityType === entityType && this.entityName === entityName && this.entityNameRange ?
            [this.entityNameRange] : 
            [];
    }

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {

        if (entityType === this.entityType && entityName === this.entityName && this.entityNameRange) {
            return [{newText: newName, range: this.entityNameRange}];
        }
        return [];
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
                entityName: this.name,
                entityNameRange: this.nameRange
            }
        }

        const variable = this.variables?.find(v => v.range.start.character <= character && character <= v.range.end.character);
        if (variable) {
            return {
                entityType: "variable",
                entityName: variable.name,
                entityNameRange: variable.range
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

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {
        const renames: TextEdit[] = [];

        if (entityType === "variable") {

            if (entityName === this.name && this.nameRange) {
                renames.push({newText: newName, range: this.nameRange});
            }
    
            this.variables?.forEach(variable => {
                if (entityName === variable.name && variable.range ) {
                    renames.push({newText: newName, range: variable.range});
                }    
            });    
        }

        return renames;
    }
}

export class ColangDocumentLineUnknown implements ColangDocumentLine {
    readonly lineType: ColangDocumentLineType = "unknown";
    line: string = "";
    lineNumber: number
    empty: boolean = false;
    else: boolean = false;
    
    constructor(line: string, lineNumber: number) {
        this.line = line;
        this.lineNumber = lineNumber;
        this.empty = line.match(/^\s*$/) !== null;
        this.else = line.match(/^\s*else\s*$/) !== null;
    }

    getPositionData(character: number): ColangDocumentPositionData {
        return {};
    }

    getReferences(entityType: ColangEntityType, entityName: string): Range[] {
        return [];
    }

    renameSymbol(entityType: ColangEntityType, entityName: string, newName: string): TextEdit[] {
        return [];
    }
}