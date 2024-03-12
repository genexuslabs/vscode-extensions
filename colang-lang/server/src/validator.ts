import { Diagnostic, DiagnosticSeverity, Position, Range } from "vscode-languageserver/node";
import { ColangDocument, ColangDocumentLine, ColangDocumentLineBot, ColangDocumentLineDefine, ColangDocumentLineDo, ColangDocumentLineIf, ColangDocumentLineMessage, ColangDocumentLineUnknown, ColangDocumentLineUser, ColangDocumentLineVariable, ColangDocumentLineWhen, ColangEntityType } from "./document";

type EntityMap = Map<string, EntityCrossReference>;
type EntityCrossReference = {
    definitions: EntityCrossReferenceData[],
    references: EntityCrossReferenceData[]
}
type EntityCrossReferenceData = {
    type: ColangEntityType;
    name: string;
    range: Range;
}
type ValidateEntityOptions = {
    skipUndefined?: boolean;
    skipDuplicate?: boolean;
    skipUnused?: boolean;
}

export class ColangDocumentValidator {
    private document: ColangDocument;
    private users: EntityMap;
    private bots: EntityMap;
    private flows: EntityMap;
    private subflows: EntityMap;
    private variables: EntityMap;
    private unknown: ColangDocumentLine[];

    constructor(document: ColangDocument) {
        this.document = document;
        this.users = new Map<string, EntityCrossReference>();
        this.bots = new Map<string, EntityCrossReference>();
        this.flows = new Map<string, EntityCrossReference>();
        this.subflows = new Map<string, EntityCrossReference>();
        this.variables = new Map<string, EntityCrossReference>();
        this.unknown = [];

        this.load();
    }

    validate(): Diagnostic[] {
        const diagnostic: Diagnostic[] = [];

        diagnostic.push(...this.validateEntity(this.users));
        diagnostic.push(...this.validateEntity(this.bots));
        diagnostic.push(...this.validateEntity(this.flows, {skipUnused: true}));
        diagnostic.push(...this.validateEntity(this.subflows));
        diagnostic.push(...this.validateEntity(this.variables, {skipDuplicate: true}));
        diagnostic.push(...this.validateUnknown(this.unknown))

        return diagnostic;
    }

    private validateEntity(entityMap: EntityMap, options: ValidateEntityOptions = {}): Diagnostic[] {
        const diagnostic: Diagnostic[] = [];

        for (let crossReferences of entityMap.values()) {
            !options.skipUndefined && diagnostic.push(...this.validateEntityUndefined(crossReferences));
            !options.skipDuplicate && diagnostic.push(...this.validateEntityDuplicate(crossReferences));
            !options.skipUnused && diagnostic.push(...this.validateEntitUnused(crossReferences));
        }

        return diagnostic;
    }

    private validateEntityUndefined(crossReferences: EntityCrossReference): Diagnostic[] {
        const diagnostic: Diagnostic[] = [];

        if (crossReferences.definitions.length === 0) {

            crossReferences.references.forEach((data: EntityCrossReferenceData) => {
                diagnostic.push({
                    message: `${this.getEntityTypePrettyName(data.type, true)} '${data.name}' does not exist`,
                    range: data.range,
                    severity: DiagnosticSeverity.Error
                });    
            });
        }

        return diagnostic;
    }

    private validateEntitUnused(crossReferences: EntityCrossReference): Diagnostic[] {
        const diagnostic: Diagnostic[] = [];

        if (crossReferences.definitions.length > 0 && crossReferences.references.length === 0) {

            crossReferences.definitions.forEach((data: EntityCrossReferenceData) => {
                diagnostic.push({
                    message: `${this.getEntityTypePrettyName(data.type, true)} '${data.name}' is declared but never used`,
                    range: data.range,
                    severity: DiagnosticSeverity.Warning
                });    
            });
        }

        return diagnostic;
    }

    private validateEntityDuplicate(crossReferences: EntityCrossReference): Diagnostic[] {
        const diagnostic: Diagnostic[] = [];

        if (crossReferences.definitions.length > 1) {

            crossReferences.definitions.forEach((data: EntityCrossReferenceData) => {
                diagnostic.push({
                    message: `Duplicate ${this.getEntityTypePrettyName(data.type)} definition`,
                    range: data.range,
                    severity: DiagnosticSeverity.Error
                });    
            });
        }

        return diagnostic;
    }

    private validateUnknown(lines: ColangDocumentLine[]): Diagnostic[] {
        const diagnostic: Diagnostic[] = [];

        lines.forEach(line => {
            
            if (line.lineType === "unknown") {
                const lineUnknown = line as ColangDocumentLineUnknown;

                if (!lineUnknown.empty && !lineUnknown.else) {
                    diagnostic.push({
                        message: `Unknown line`,
                        range: Range.create(
                            Position.create(lineUnknown.lineNumber, 0),
                            Position.create(lineUnknown.lineNumber, lineUnknown.line.length)
                        ),
                        severity: DiagnosticSeverity.Error
                    });            
                }
            }
        })

        return diagnostic;
    }

    private load() {

        this.document.lines.forEach(line => {

            switch(line.lineType) {
            case "define":
                this.loadDefine(line);
                break;
            case "user":
                this.loadUser(line);
                break;
            case "bot":
                this.loadBot(line);
                break;
            case "do":
                this.loadDo(line);
                break;
            case "message":
                this.loadMessage(line);
                break;
            case "if":
                this.loadIf(line);
                break;
            case "when":
                this.loadWhen(line);
                break;
            case "variable":
                this.loadVariable(line);
                break;
            case "unknown":
                this.unknown.push(line);
                break;
            }
        })
    }

    private loadDefine(line: ColangDocumentLineDefine) {

        if (line.entityType && line.entityName && line.entityNameRange) {
            const crossReference = this.getEntityCrossReference(line.entityType, line.entityName);
            crossReference.definitions.push({
                type: line.entityType,
                name: line.entityName,
                range: line.entityNameRange
            });
        } else {
            this.unknown.push(line);
        }
    }

    private loadUser(line: ColangDocumentLineUser) {

        if (line.entityName && line.entityNameRange) {
            const crossReference = this.getEntityCrossReference("user", line.entityName);
            crossReference.references.push({
                type: "user",
                name: line.entityName,
                range: line.entityNameRange
            });
        } else {
            this.unknown.push(line);
        }
    }

    private loadBot(line: ColangDocumentLineBot) {

        if (line.entityName && line.entityNameRange) {
            const crossReference = this.getEntityCrossReference("bot", line.entityName);
            crossReference.references.push({
                type: "bot",
                name: line.entityName,
                range: line.entityNameRange
            });
        } else {
            this.unknown.push(line);
        }
    }

    private loadDo(line: ColangDocumentLineDo) {

        if (line.entityName && line.entityNameRange) {
            const crossReference = this.getEntityCrossReference("subflow", line.entityName);
            crossReference.references.push({
                type: "subflow",
                name: line.entityName,
                range: line.entityNameRange
            });
        } else {
            this.unknown.push(line);
        }
    }

    private loadMessage(line: ColangDocumentLineMessage) {

        for (let variable of line.variables ?? []) {
            const crossReference = this.getEntityCrossReference("variable", variable.name);
            crossReference.references.push({
                type: "variable",
                name: variable.name,
                range: variable.range
            });
        }
    }

    private loadIf(line: ColangDocumentLineIf) {

        for (let variable of line.variables ?? []) {
            const crossReference = this.getEntityCrossReference("variable", variable.name);
            crossReference.references.push({
                type: "variable",
                name: variable.name,
                range: variable.range
            });
        }
    }

    private loadWhen(line: ColangDocumentLineWhen) {

        if (line.entityType && line.entityName && line.entityNameRange) {
            const crossReference = this.getEntityCrossReference(line.entityType, line.entityName);
            crossReference.references.push({
                type: line.entityType,
                name: line.entityName,
                range: line.entityNameRange
            });
        } else {
            this.unknown.push(line);
        }
    }

    private loadVariable(line: ColangDocumentLineVariable) {

        if (line.name && line.nameRange) {
            const crossReference = this.getEntityCrossReference("variable", line.name);
            crossReference.definitions.push({
                type: "variable",
                name: line.name,
                range: line.nameRange
            });
        } else {
            this.unknown.push(line);
        }

        for (let variable of line.variables ?? []) {
            const crossReference = this.getEntityCrossReference("variable", variable.name);
            crossReference.references.push({
                type: "variable",
                name: variable.name,
                range: variable.range
            });
        }
    }

    private getEntityCrossReference(entityType: ColangEntityType, entityName: string): EntityCrossReference {
        let map: EntityMap;

        switch(entityType) {
        case "user":
            map = this.users;
            break;
        case "bot":
            map = this.bots;
            break;
        case "flow":
            map = this.flows;
            break;
        case "subflow":
            map = this.subflows;
            break;
        case "variable":
            map = this.variables;
            break;
        }
    
        let crossReference = map.get(entityName);
        if (!crossReference) {
            crossReference = {definitions: [], references: []}
            map.set(entityName, crossReference);
        }

        return crossReference;
    }

    private getEntityTypePrettyName(entityType: ColangEntityType, capitalize: Boolean = false): string {
        if (capitalize) {
            return entityType[0].toUpperCase() + entityType.slice(1).toLowerCase();
        }
        return entityType;
    }
}
