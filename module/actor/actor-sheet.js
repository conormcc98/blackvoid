/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BlackVoidActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["blackvoid", "sheet", "actor"],
      template: "systems/blackvoid/templates/actor/actor-sheet.html",
      width: 625,
      height: 825,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }

    // Extract object types
    data.backgrounds = data.items.filter((item) => { return item.type == "background" });
    data.skills = data.items.filter((item) => { return item.type == "skill" });
    data.combatskills = data.items.filter((item) => { return item.type == "combatskill" });
    data.characterattributes = data.items.filter((item) => { return item.type == "attribute" });
    data.esotericattributes = data.items.filter((item) => { return item.type == "esotericattribute" });
    data.talents = data.items.filter((item) => { return item.type == "talent" });
    data.flaws = data.items.filter((item) => { return item.type == "flaw" });
    data.generalitems = data.items.filter((item) => { return item.type == "item"});
    data.tools = data.items.filter((item) => { return item.type == "tool" });
    data.weapons = data.items.filter((item) => { return item.type == "weapon" });
    data.armour = data.items.filter((item) => { return item.type == "armour" });
    data.shields = data.items.filter((item) => { return item.type == "shield" });
    data.consumables = data.items.filter((item) => { return item.type == "consumable" });
    data.methods = data.items.filter((item) => { return item.type == "method" });
    data.spheres = data.items.filter((item) => { return item.type == "sphere" });
    data.phenomena = data.items.filter((item) => { return item.type == "phenomenon" });

    // Extract boolean values
    data.hasAttributes = false;
    data.hasEsotericAttributes = false;
    data.hasPowers = false;
    data.hasGeneralItems = data.generalitems.length > 0;
    data.hasTools = data.tools.length > 0;
    data.hasWeapons = data.weapons.length > 0;
    data.hasArmour = data.armour.length > 0;
    data.hasShields = data.shields.length > 0;
    data.hasConsumables = data.consumables.length > 0;
    data.showInventoryTab = data.hasGeneralItems || data.hasTools || data.hasWeapons || data.hasArmour || data.hasShields || data.hasConsumables;
    data.hasMethods = data.methods.length > 0;

    data.hasTalents = data.talents.length > 0;
    data.hasFlaws = data.flaws.length > 0;
    data.showTalentsTab = data.hasTalents || data.hasFlaws;

    data.hasBackgrounds = data.backgrounds.length > 0;

    data.hasSkills = data.skills.length > 0;
    data.hasCombatSkills = data.combatskills.length > 0;
    data.showSkillsTab = data.hasSkills || data.hasCombatSkills;

    data.isMystic = false;
    data.hasBloodletting = false;
    data.hasSacrificialDivination = false;

    // Determine if character should have Attributes, Powers, Both, or Neither
    data.backgrounds.forEach(background => {
      if (background.name == "Voidmarked") {
        data.hasAttributes = true;
        data.hasEsotericAttributes = true;
        data.hasPowers = true;
      } else if (background.name == "Halfblood") {
        data.hasAttributes = true;
      }
    });

    // Determine if the character is a mystic
    data.methods.forEach(method => {
      if (method.name.includes("Mysticism")) data.isMystic = true;
    });

    // Determine if the character has 'Bloodletting'
    data.methods.forEach(method => {
      if (method.name.includes("Bloodletting")) data.hasBloodletting = true;
    });

    // Determine if the character has 'Sacrificial Divination'
    data.methods.forEach(method => {
      if (method.name.includes("Sacrificial Divination")) data.hasSacrificialDivination = true;
    });

    // Determine the character's defence value
    let defenceBase = 7;
    let sizeFactor = 5
    let hpFactor = 6;
    
    data.characterattributes.forEach(attribute => {
      if (attribute.name == "Large") { defenceBase = 6; sizeFactor = 6; hpFactor = 7; }
    })

    let shieldBonus = 0;

    data.shields.forEach(shield => {
      shieldBonus += shield.data.defenceMod;
    });

    let skillBonus = 0;

    data.combatskills.forEach(skill => {
      if (skill.name == "Defence") skillBonus += skill.data.ranks;
    });

    data.defenceValue = defenceBase + shieldBonus + skillBonus + data.data.abilities.agi.mod;

    // Determine the character's speed
    data.speed = sizeFactor + data.data.abilities.str.mod;

    // Determine the character's maximum hit points
    data.hitPointMaximum = (data.data.abilities.sta.value * hpFactor) + data.data.rolledHP + data.data.bonusHP;

    // Determine the character's maximum sanity
    data.sanityMaximum = (data.data.abilities.wil.value * 6) + data.data.rolledSanity + data.data.bonusSanity;

    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.roll) {
      let roll = new Roll(dataset.roll, this.actor.data.data);
      let label = ""

      if (dataset.label.includes("SKILL")) {
        let d = new Dialog({
          title: "Roll",
          content: "<p>What trait should be used for the roll?</p>",
          buttons: {
            agi: {
              label: "Agility",
              callback: () => {
                // Determine roll formula
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.agi.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.agi.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.agi.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} (Agility) Check`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            },
            awa: {
              label: "Awareness",
              callback: () => {
                // Determine roll formula
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.awa.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.awa.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.awa.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} (Awareness) Check`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            },
            sta: {
              label: "Stamina",
              callback: () => {
                // Determine roll formula
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.sta.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.sta.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.sta.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} (Stamina) Check`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            },
            str: {
              label: "Strength",
              callback: () => {
                // Determine roll formula
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.str.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.str.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.str.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} (Strength) Check`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            },
            wil: {
              label: "Willpower",
              callback: () => {
                // Determine roll formula
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.wil.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.wil.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.wil.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} (Willpower) Check`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            },
            pre: {
              label: "Presence",
              callback: () => {
                // Determine roll formula
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.pre.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.pre.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.pre.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} (Presence) Check`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            },
            per: {
              label: "Persuasion",
              callback: () => {
                // Determine roll formula
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.per.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.per.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.per.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} (Persuasion) Check`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            },
            int: {
              label: "Intellect",
              callback: () => {
                // Determine roll formula
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.int.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.int.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.int.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} (Intellect) Check`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            }
          }
        });

        d.render(true);
      } else if (dataset.label.includes("ATTACK")) {
        // Determine roll label
        let label = dataset.label
        let parts = label.split('_')
        label = `${parts[1]} Attack`

        roll.roll().toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: label
        });
      } else if (dataset.label.includes("DAMAGE")) {
        // Determine roll label
        let label = dataset.label
        let parts = label.split('_')
        label = `${parts[1]} Damage`

        let d = new Dialog({
          title: "Roll",
          content: "<p>Add your Strength modifier?</p>",
          buttons: {
            yes: {
              label: "Yes",
              callback: () => {
                let rollFormula = dataset.roll
                if(this.actor.data.data.abilities.str.mod < 0) rollFormula = rollFormula + this.actor.data.data.abilities.str.mod
                else rollFormula = rollFormula + "+" + this.actor.data.data.abilities.str.mod
                roll = new Roll(rollFormula, {})
                
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} Damage`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            },
            no: {
              label: "No",
              callback: () => {
                // Determine roll label
                let label = dataset.label
                let parts = label.split('_')
                label = `${parts[1]} Damage`


                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            }
          }
        });

        d.render(true);
      } else if (dataset.label.includes("METHOD")) {
        let rollFormula = dataset.roll;
        let label = dataset.label
        let parts = label.split('_')
        label = `Using ${parts[1]} Method`

        let methodName = parts[1].split(' - ')[1];

        switch(methodName) {
          case 'Sacrificial Divination':
            let d = new Dialog({
              title: "Sacrificial Divination",
              content: "<p>Which trait should be used?</p>",
              buttons: {
                awareness: {
                  label: "Awareness",
                  callback: () => { rollFormula = rollFormula + "+" + this.actor.data.data.abilities.awa.mod; }
                },
                intellect: {
                  label: "Intellect",
                  callback: () => { rollFormula = rollFormula + "+" + this.actor.data.data.abilities.int.mod; }
                }
              },
              close: html => {
                roll = new Roll(rollFormula, {});

                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
            });
            d.render(true);
            break;
          case 'Furore':
            rollFormula = rollFormula + "+" + this.actor.data.data.abilities.wil.mod;
            roll = new Roll(rollFormula, {});
            roll.roll().toMessage({
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              flavor: label
            });
            break;
          case 'Bloodletting':
          case 'Gnostic':
            rollFormula = rollFormula + "+" + this.actor.data.data.abilities.int.mod;
            roll = new Roll(rollFormula, {});
            roll.roll().toMessage({
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              flavor: label
            });
            break;
          default:
            console.log(`Couldn't recognise method ${methodName}`)
            break;
        }
      } else if (dataset.label.includes("PHENOMENON")) {
        let table = dataset.table;
        let label = dataset.label;
        let parts = label.split('_')

        let messageData = {
          user: game.user._id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: table,
          flavor: parts[1]
        }

        ChatMessage.create(messageData, {});

      } else {
        if (dataset.label == "agi") {
          let d = new Dialog({
            title: "Roll",
            content: "<p>What type of check?</p>",
            buttons: {
              one: {
                label: "Basic Ability Check",
                callback: () => {
                  roll.roll().toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: "Basic Agility Check"
                  });
                }
              },
              two: {
                label: "Untrained Skill Check",
                callback: () => {
                  let newFormula = roll.formula.slice(0, -3)
                  newFormula += "-3";

                  let newRoll = new Roll(newFormula, {})

                  newRoll.roll().toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: "Untrained Agility Check"
                  });
                }
              },
              three: {
                label: "Initiative Roll",
                callback: () => {
                  let newFormula = roll.formula.slice(0, -3)
                  let newRoll = new Roll(newFormula, {})

                  newRoll.roll().toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: "Initiative Roll"
                  });
                }
              },
              four: {
                label: "Untrained Attack Roll",
                callback: () => {
                  let newFormula = roll.formula.slice(0, -3)
                  let newRoll = new Roll(newFormula, {})

                  newRoll.roll().toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: "Untrained Attack Roll"
                  });
                }
              }
            }
          })

          d.render(true)
        } else {
          let d = new Dialog({
            title: "Roll",
            content: "<p>What type of check?</p>",
            buttons: {
             one: {
              label: "Basic Ability Check",
              callback: () => {
                console.log(roll.formula)
                switch(dataset.label) {
                  case "awa":
                    label = "Basic Awareness Check"
                    break
                  case "sta":
                    label = "Basic Stamina Check"
                    break
                  case "str":
                    label = "Basic Strength Check"
                    break
                  case "wil":
                    label = "Basic Willpower Check"
                    break
                  case "pre":
                    label = "Basic Presence Check"
                    break
                  case "per":
                    label = "Basic Persuasion Check"
                    break
                  case "int":
                    label = "Basic Intellect Check"
                    break
                  default:
                    label = dataset.label ? `Rolling ${dataset.label}` : '';
                    break;
                }
    
                roll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
             },
             two: {
              label: "Untrained Skill Check",
              callback: () => {
                let newFormula = roll.formula.slice(0, -3)
                newFormula += "-3";
    
                let newRoll = new Roll(newFormula, {})
                switch(dataset.label) {
                  case "awa":
                    label = "Untrained Awareness Check"
                    break
                  case "sta":
                    label = "Untrained Stamina Check"
                    break
                  case "str":
                    label = "Untrained Strength Check"
                    break
                  case "wil":
                    label = "Untrained Willpower Check"
                    break
                  case "pre":
                    label = "Untrained Presence Check"
                    break
                  case "per":
                    label = "Untrained Persuasion Check"
                    break
                  case "int":
                    label = "Untrained Intellect Check"
                    break
                  default:
                    label = dataset.label ? `Rolling ${dataset.label}` : '';
                    break;
                }
    
                newRoll.roll().toMessage({
                  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                  flavor: label
                });
              }
             }
            },
            default: "one",
           });
           d.render(true);
        }
      }
    }
  }
}
