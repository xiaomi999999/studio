import { observable } from "mobx";

import { stringCompare } from "eez-studio-shared/string";

import { validators } from "eez-studio-shared/validation";
import * as output from "project-editor/core/output";

//import { isReferenced } from "project-editor/core/search";

import { showGenericDialog, EnumItems } from "eez-studio-ui/generic-dialog";

import {
    ClassInfo,
    IEezObject,
    EezObject,
    PropertyType,
    getChildOfObject,
    getParent,
    getLabel
} from "project-editor/core/object";

import { ProjectStore } from "project-editor/core/store";

import { Scpi } from "project-editor/features/scpi/scpi";

import { ScpiEnumsNavigation } from "project-editor/features/scpi/ScpiEnumsNavigation";

////////////////////////////////////////////////////////////////////////////////

export class ScpiEnumMember extends EezObject {
    @observable
    name: string;

    @observable
    value: string;

    static classInfo: ClassInfo = {
        properties: [
            {
                name: "name",
                type: PropertyType.String
            },
            {
                name: "value",
                type: PropertyType.String
            }
        ],

        defaultValue: {}
    };

    check() {
        const messages: output.Message[] = [];

        if (this.name) {
            const arr = getParent(this) as ScpiEnumMember[];
            let thisIndex = -1;
            let otherIndex = -1;
            for (let i = 0; i < arr.length; ++i) {
                if (arr[i] === this) {
                    thisIndex = i;
                } else if (arr[i] !== this && arr[i].name === this.name) {
                    otherIndex = i;
                }
            }
            if (otherIndex !== -1 && thisIndex > otherIndex) {
                messages.push(
                    new output.Message(
                        output.Type.ERROR,
                        `Member name '${this.name}' is not unique`,
                        getChildOfObject(this, "name")
                    )
                );
            }
        } else {
            messages.push(output.propertyNotSetMessage(this, "name"));
        }

        return messages;
    }
}

////////////////////////////////////////////////////////////////////////////////

export class ScpiEnum extends EezObject {
    @observable
    name: string;

    @observable
    members: ScpiEnumMember[];

    static classInfo: ClassInfo = {
        label: (scpiEnum: ScpiEnum) => {
            return `${scpiEnum.name} (${scpiEnum.members.map(member => member.name).join("|")})`;
        },
        properties: [
            {
                name: "name",
                type: PropertyType.String,
                unique: true
            },
            {
                name: "members",
                type: PropertyType.Array,
                typeClass: ScpiEnumMember
            }
        ],
        newItem: (parent: IEezObject) => {
            return showGenericDialog({
                dialogDefinition: {
                    title: "New Enumaration",
                    fields: [
                        {
                            name: "name",
                            type: "string",
                            validators: [validators.required, validators.unique({}, parent)]
                        }
                    ]
                },
                values: {}
            }).then(result => {
                return Promise.resolve({
                    name: result.values.name
                });
            });
        },
        navigationComponent: ScpiEnumsNavigation,
        navigationComponentId: "scpi-enums",
        icon: "format_list_numbered"
    };

    check() {
        const messages: output.Message[] = [];

        // TODO this check is removed because it is too slow
        // if (!isReferenced(this)) {
        //     messages.push(
        //         new output.Message(output.Type.WARNING, "enum not used in the project", this)
        //     );
        // }

        return messages;
    }
}

////////////////////////////////////////////////////////////////////////////////

export function findScpiEnum(enumeration: string) {
    const scpi = (ProjectStore.project as any).scpi as Scpi;

    for (let i = 0; i < scpi.enums.length; ++i) {
        if (scpi.enums[i].name === enumeration) {
            return scpi.enums[i];
        }
    }

    return undefined;
}

export function getScpiEnumsAsDialogEnumItems(): EnumItems {
    const scpi = (ProjectStore.project as any).scpi as Scpi;

    return scpi.enums
        .slice()
        .sort((a, b) => stringCompare(getLabel(a), getLabel(b)))
        .map(scpiEnum => ({
            id: scpiEnum.name,
            label: getLabel(scpiEnum)
        }));
}
