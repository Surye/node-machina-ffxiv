'use strict';

const fs = require('fs');
const path = require('path');

// Server-zone packets
this.actorControl                  = require('./actorControl.js');
this.actorControlSelf              = require('./actorControlSelf.js');
this.actorControlTarget            = require('./actorControlTarget.js');
this.chat                          = require('./chat.js');
this.examineSearchInfo             = require('./examineSearchInfo.js');
this.freeCompanyEvent              = require('./freeCompanyEvent.js');
this.freeCompanyUpdateShortMessage = require('./freeCompanyUpdateShortMessage.js');
this.itemInfo                      = require('./itemInfo.js');
this.logMessage                    = require('./logMessage.js');
this.npcSpawn                      = require('./npcSpawn.js');
// Disabled until we find a better implementation for materia without needing csv or request.
this.marketBoardItemListing        = require('./marketBoardItemListing.js');
this.marketBoardItemListingHistory = require('./marketBoardItemListingHistory.js');
this.messageFC                     = require('./messageFC.js');
this.playtime                      = require('./playtime.js');
this.playerSetup                   = require('./playerSetup.js');
this.playerStats                   = require('./playerStats.js');
this.updateHpMpTp                  = require('./updateHpMpTp');
this.updateInventorySlot           = require('./updateInventorySlot.js');

// Actor control packets
this.aetherReductionDlg            = require('./actorControl/aetherReductionDlg.js');
this.desynthOrReductionResult      = require('./actorControl/desynthOrReductionResult.js');
this.craftingUnk                   = require('./actorControl/craftingUnk.js');

// Client-zone packets
this.chatHandler                   = require('./chatHandler.js');
this.emoteEventHandler             = require('./emoteEventHandler.js');
this.inventoryModifyHandler        = require('./inventoryModifyHandler.js');

// Methods

module.exports.loadDefinitions = (definitionsDir) => {
    definitionsDir = definitionsDir || path.join(__dirname, "./default");
    // Auto-generated processing definitions; not necessarily low on size
    // or as rich as we can make them so we deprioritize them.
    let dir = fs.readdirSync(definitionsDir);
    for (let def of dir) {
        let packetDef = def.substr(0, def.indexOf("."));
        if (!this[packetDef]) {
            this[packetDef] = require(path.join(definitionsDir, def));
        }
    }

};

module.exports.parse = async (logger, struct, noData) => {
    if (struct.segmentType !== 0x03) {
        logger(`[${getTime()}] Packet recieved with no IPC data, ignoring...`)
        return;
    } // No IPC data

    // Testing
    /*let testSequence = new Uint8Array([]);
    if (hasSubArray(struct.data, testSequence)) {
        if (struct.type === "unknown") {
            console.log(`Found data in IPC ${struct.operation} type ${struct.type} (${this.getUint16(struct.data, 0x12)})`);
        } else {
            console.log(`Found data in IPC ${struct.operation} type ${struct.type}`);
        }

        console.log(struct.data.toString());
        console.log(String.fromCodePoint(...struct.data));
    }

    /*switch (this.getUint16(struct.data, 0x12)) {
        case 0x013B:
            console.log("0x013B");
            console.log(struct.data.toString());
            console.log(String.fromCodePoint(...struct.data));
            break;
    }

    /*if (String.fromCodePoint(...struct.data).includes("")) {
        console.log(struct.data.toString());
        console.log(String.fromCodePoint(...struct.data));
    } else {
        return;
    }*/

    if (struct.type.startsWith("ping") && (struct.packetSize === 1064 /* pingHandler */ || struct.packetSize === 1112 /* ping */)) {
        struct.superType = "message";
        struct.type = "messageFC";
    }

    // Read IPC data
    if (this[struct.type]) {
        try {
            await this[struct.type](struct);
            logger(`[${getTime()}] Processed packet ${struct.type}, firing event...`);
        } catch (err) {
            logger(`[${getTime()}] Failed to process packet ${struct.type}, got error ${err}`);
        }
    }

    if (this[struct.subType]) {
        try {
            await this[struct.subType](struct);
            logger(`[${getTime()}] Processed packet ${struct.subType}, firing event...`);
        } catch (err) {
            logger(`[${getTime()}] Failed to process packet ${struct.subType}, got error ${err}`);
        }
    }

    if (noData) delete struct.data;

    return struct;
};

module.exports.parseAndEmit = async (logger, struct, noData, context) => {
    if (struct.segmentType !== 0x03) {
        logger(`[${getTime()}] Packet recieved with no IPC data, ignoring...`)
        return;
    } // No IPC data

    await this.parse(logger, struct, noData, context);

    context.emit(struct.type, struct); // Emit a parsed event
    if (struct.subType) context.emit(struct.subType, struct);
    if (struct.superType) context.emit(struct.superType, struct); // Emit another event so you can write catch-alls
    context.emit("any", struct); // Emit an even bigger catchall
};

module.exports.uint8ArrayToHexArray = (array) => {
    let newArray = [];
    for (let i = 0; i < array.length; i++) {
        let temp = array[i].toString(16);
        if (temp.length === 1) temp = `0${temp}`;
        newArray[i] = temp;
    }
    return newArray;
};

module.exports.getUint16 = (uint8Array, offset) => {
    if (typeof offset === 'undefined') throw "Parameter 'offset' not provided.";

    let buffer = new DataView(new ArrayBuffer(2));
    for (let i = 0; i < 2; i++) {
        buffer.setUint8(i, uint8Array[offset + i]);
    }
    return buffer.getUint16(0, true);
};

module.exports.getInt32 = (uint8Array, offset) => {
    if (typeof offset === 'undefined') throw "Parameter 'offset' not provided.";

    let buffer = new DataView(new ArrayBuffer(4));
    for (let i = 0; i < 4; i++) {
        buffer.setUint8(i, uint8Array[offset + i]);
    }
    return buffer.getInt32(0, true);
};

module.exports.getUint32 = (uint8Array, offset) => {
    if (typeof offset === 'undefined') throw "Parameter 'offset' not provided.";

    let buffer = new DataView(new ArrayBuffer(4));
    for (let i = 0; i < 4; i++) {
        buffer.setUint8(i, uint8Array[offset + i]);
    }
    return buffer.getUint32(0, true);
};

module.exports.getUint64 = (uint8Array, offset) => {
    if (typeof offset === 'undefined') throw "Parameter 'offset' not provided.";

    let buffer = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 8; i++) {
        buffer.setUint8(i, uint8Array[offset + i]);
    }

    let num = `${buffer.getBigUint64(0, true)}`;
    return num.substr(0, num.length - 1);
};

const getTime = () => {
    const time = new Date();
    let m = time.getMinutes();
    if (m < 10) {
        m = `0${m}`;
    }
    return `${time.getHours()}:${m}`;
};

function hasSubArray(master, sub) {
    return sub.every((i => v => i = master.indexOf(v, i) + 1)(0));
}

module.exports.cityIDList = {
    0x01: "Limsa Lominsa",
    0x02: "Gridania",
    0x03: "Ul'dah",
    0x04: "Ishgard",
    0x07: "Kugane",
    0x0A: "Crystarium"
};

// https://github.com/SapphireServer/Sapphire/blob/develop/src/common/Common.h#L731-L834
module.exports.chatType = [
    "LogKindError",
    "ServerDebug",
    "ServerUrgent",
    "ServerNotice",
    "Unused4",
    "Unused5",
    "Unused6",
    "Unused7",
    "Unused8",
    "Unused9",
    "Say",
    "Shout",
    "Tell",
    "TellReceive",
    "Party",
    "Alliance",
    "LS1",
    "LS2",
    "LS3",
    "LS4",
    "LS5",
    "LS6",
    "LS7",
    "LS8",
    "FreeCompany",
    "Unused25",
    "Unused26",
    "NoviceNetwork",
    "CustomEmote",
    "StandardEmote",
    "Yell",
    "Unknown31",
    "PartyUnk2",
    "Unused33",
    "Unused34",
    "Unused35",
    "Unused36",
    "Unused37",
    "Unused38",
    "Unused39",
    "Unused40",
    "BattleDamage",
    "BattleFailed",
    "BattleActions",
    "BattleItems",
    "BattleHealing",
    "BattleBeneficial",
    "BattleDetrimental",
    "BattleUnk48",
    "BattleUnk49",
    "Unused50",
    "Unused51",
    "Unused52",
    "Unused53",
    "Unused54",
    "Unused55",
    "Echo",
    "SystemMessage",
    "SystemErrorMessage",
    "BattleSystem",
    "GatheringSystem",
    "NPCMessage",
    "LootMessage",
    "Unused63",
    "CharProgress",
    "Loot",
    "Crafting",
    "Gathering",
    "NPCAnnouncement",
    "FCAnnouncement",
    "FCLogin",
    "RetainerSale",
    "PartySearch",
    "PCSign",
    "DiceRoll",
    "NoviceNetworkNotice",
    "Unknown76",
    "Unused77",
    "Unused78",
    "Unused79",
    "GMTell",
    "GMSay",
    "GMShout",
    "GMYell",
    "GMParty",
    "GMFreeCompany",
    "GMLS1",
    "GMLS2",
    "GMLS3",
    "GMLS4",
    "GMLS5",
    "GMLS6",
    "GMLS7",
    "GMLS8",
    "GMNoviceNetwork",
    "Unused95",
    "Unused96",
    "Unused97",
    "Unused98",
    "Unused99",
    "Unused100"
];
