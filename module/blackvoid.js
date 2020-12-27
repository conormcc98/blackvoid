// Import Modules
import { BlackVoidActor } from "./actor/actor.js";
import { BlackVoidActorSheet } from "./actor/actor-sheet.js";
import { BlackVoidItem } from "./item/item.js";
import { BlackVoidItemSheet } from "./item/item-sheet.js";

Hooks.once('init', async function() {

  game.blackvoid = {
    BlackVoidActor,
    BlackVoidItem
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d12",
    decimals: 2
  };

  // Define custom Entity classes
  CONFIG.Actor.entityClass = BlackVoidActor;
  CONFIG.Item.entityClass = BlackVoidItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("blackvoid", BlackVoidActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("blackvoid", BlackVoidItemSheet, { makeDefault: true });

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });
});