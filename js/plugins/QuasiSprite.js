//============================================================================
// Quasi Sprite
// Version: 1.04
// Last Update: March 16, 2016
//============================================================================
// ** Terms of Use
// http://quasixi.com/terms-of-use/
// https://github.com/quasixi/RPG-Maker-MV/blob/master/README.md
//============================================================================
// How to install:
//  - Save this file as "QuasiSprite.js" in your js/plugins/ folder
//  - Add plugin through the plugin manager
//  - Configure as needed
//  - Open the Help menu for setup guide or visit one of the following:
//  - - http://quasixi.com/mv/
//  - - http://quasixi.com/quasi-sprite/
//============================================================================

var Imported = Imported || {};
Imported.Quasi_Sprite = 1.04;

//=============================================================================
 /*:
 * @plugindesc Lets you configure Spritesheets
 * Version 1.04
 * @author Quasi      Site: http://quasixi.com
 *
 * @help
 * ============================================================================
 * ** Links
 * ============================================================================
 * For a guide on how to use this plugin go to:
 *
 *   http://quasixi.com/quasi-sprite/
 *
 * Other Links
 *  - https://github.com/quasixi/RPG-Maker-MV
 *  - http://forums.rpgmakerweb.com/index.php?/topic/57648-quasi-sprite/
 */
//=============================================================================

//-----------------------------------------------------------------------------
// Quasi Sprite

var QuasiSprite = {};
(function(QuasiSprite) {
  QuasiSprite.loadSettings = function() {
    var xhr = new XMLHttpRequest();
    var url = 'data/SpriteAnim.json';
    xhr.open('GET', url, true);
    xhr.overrideMimeType('application/json');
    xhr.onload = function() {
      if (xhr.status < 400) {
        QuasiSprite.json = JSON.parse(xhr.responseText);
      }
    };
    xhr.send();
  };
  QuasiSprite.loadSettings();

  //-----------------------------------------------------------------------------
  // Game_Interpreter
  //
  // The interpreter for running event commands.

  var Alias_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    if (command.toLowerCase() === "quasi") {
      if (args[0].toLowerCase() === "playpose") {
        var charaId = Number(args[1]);
        var chara = charaId === 0 ? $gamePlayer : $gameMap.event(charaId);
        var pose = args[2];
        var locked = args[3] === "true";
        chara.playPose(pose, locked);
      }
    }
    Alias_Game_Interpreter_pluginCommand.call(this, command, args);
  };

  //-----------------------------------------------------------------------------
  // Game_CharacterBase
  //
  // The superclass of Game_Character. It handles basic information, such as
  // coordinates and images, shared by all characters.

  var Alias_Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
  Game_CharacterBase.prototype.initMembers = function() {
    Alias_Game_CharacterBase_initMembers.call(this);
    this._pose = "";
  };

  var Alias_Game_CharacterBase_animationWait = Game_CharacterBase.prototype.animationWait;
  Game_CharacterBase.prototype.animationWait = function() {
    if (this._qSprite && this._qSprite.poses[this._pose]) {
      var pose = this._qSprite.poses[this._pose];
      if (pose.adjust) {
        return (pose.speed - this.realMoveSpeed()) * 3;
      }
      return pose.speed;
    }
    return Alias_Game_CharacterBase_animationWait.call(this);
  };

  var Alias_Game_CharacterBase_update = Game_CharacterBase.prototype.update;
  Game_CharacterBase.prototype.update = function() {
    var wasMoving = this.isMoving();
    Alias_Game_CharacterBase_update.call(this);
    this.updatePose(wasMoving);
  };

  Game_CharacterBase.prototype.updatePose = function(wasMoving) {
    var isMoving = wasMoving || this.isMoving();
    if (this._posePlaying) return;
    if (this._qSprite) {
      var dir = this._direction;
      if (Imported.Quasi_Movement && this.isDiagonal()) {
        var diag = this.isDiagonal();
        if (this.hasPose("idle" + diag)) {
          dir = diag;
        }
      }
      if (!isMoving && this.hasPose("idle" + dir)) {
        if (this._pose !== "idle" + dir) {
          this._pattern = 0;
          this._animationCount = 0;
          this._isIdle = true;
        }
        this._pose = "idle" + dir;
      } else {
        if (!isMoving) this._pattern = 0;
        if (Imported.Quasi_Movement && this.isDiagonal()) {
          dir = this.isDiagonal();
        }
        this._isIdle = false;
        if (!this.hasPose("move" + dir)) return;
        this._pose = "move" + dir;
      }
      return;
    }
    this._pose = "";
  };

  var Alias_Game_CharacterBase_updateAnimationCount = Game_CharacterBase.prototype.updateAnimationCount;
  Game_CharacterBase.prototype.updateAnimationCount = function() {
    if (this._isIdle || this._posePlaying) {
      this._animationCount++;
      return;
    }
    Alias_Game_CharacterBase_updateAnimationCount.call(this);
  };

  var Alias_Game_CharacterBase_updatePattern = Game_CharacterBase.prototype.updatePattern;
  Game_CharacterBase.prototype.updatePattern = function() {
    if (this._isIdle || this._posePlaying || this._qSprite) {
      this._pattern++;
      if (this._pattern === this.maxPattern()) {
        if (this._posePlaying) {
          this._posePlaying = false;
          this._locked = false;
        }
        this.resetPattern();
      }
      return;
    }
    return Alias_Game_CharacterBase_updatePattern.call(this);
  };

  var Alias_Game_CharacterBase_maxPattern = Game_CharacterBase.prototype.maxPattern;
  Game_CharacterBase.prototype.maxPattern = function() {
    if (this._qSprite) {
      return this._qSprite.poses[this._pose].pattern.length;
    }
    return Alias_Game_CharacterBase_maxPattern.call(this);
  };

  Game_CharacterBase.prototype.resetPattern = function() {
    this._qSprite ? this.setPattern(0) : this.setPattern(1);
  };

  Game_CharacterBase.prototype.hasPose = function(pose) {
    if (this._qSprite) {
      return this._qSprite.poses.hasOwnProperty(pose);
    }
    return false;
  };

  var Alias_Game_CharacterBase_setImage = Game_CharacterBase.prototype.setImage;
  Game_CharacterBase.prototype.setImage = function(characterName, characterIndex) {
    Alias_Game_CharacterBase_setImage.call(this, characterName, characterIndex);
    this._isQChara = undefined;
    this._qSprite = this.isQCharacter() ? QuasiSprite.json[this.isQCharacter()] : null;
  };

  Game_CharacterBase.prototype.playPose = function(pose, wait) {
    if (this._qSprite) {
      var dir = this._direction;
      if (Imported.Quasi_Movement && this.isDiagonal()) {
        dir = this.isDiagonal();
      }
      pose += dir;
    }
    if (!this.hasPose(pose)) return;
    this._pose = pose;
    this._posePlaying = true;
    this._waitForPose = wait;
    this._animationCount = 0;
    this._pattern = 0;
  };

  Game_CharacterBase.prototype.isQCharacter = function() {
    if (this._isQChara === undefined) {
      this._isQChara = this._characterName.match(/^#(.+?)-/);
    }
    return this._isQChara ? this._isQChara[1] : false;
  };

  //-----------------------------------------------------------------------------
  // Game_Player
  //
  // The game object class for the player. It contains event starting
  // determinants and map scrolling functions.

  var Alias_Game_Player_canMove = Game_Player.prototype.canMove;
  Game_Player.prototype.canMove = function() {
    if (this._posePlaying && this._waitForPose) return false;
    return Alias_Game_Player_canMove.call(this);
  };

  Game_Player.prototype.actor = function() {
    return $gameParty.leader();
  };

  //-----------------------------------------------------------------------------
  // Sprite_Character
  //
  // The sprite for displaying a character.

  var Alias_Sprite_Character_characterBlockX = Sprite_Character.prototype.characterBlockX;
  Sprite_Character.prototype.characterBlockX = function() {
    if (this._character.isQCharacter()) return 0;
    return Alias_Sprite_Character_characterBlockX.call(this);
  };

  var Alias_Sprite_Character_characterBlockY = Sprite_Character.prototype.characterBlockY;
  Sprite_Character.prototype.characterBlockY = function() {
    if (this._character.isQCharacter()) return 0;
    return Alias_Sprite_Character_characterBlockY.call(this);
  };

  var Alias_Sprite_Character_characterPatternX = Sprite_Character.prototype.characterPatternX;
  Sprite_Character.prototype.characterPatternX = function() {
    if (this._character.isQCharacter()) {
      var pose = this._character._qSprite.poses[this._character._pose];
      if (!pose) return 0;
      var pattern = pose.pattern;
      var i = pattern[this._character._pattern];
      var x = i % this._character._qSprite.cols;
      return x;
    }
    return Alias_Sprite_Character_characterPatternX.call(this);
  };

  var Alias_Sprite_Character_characterPatternY = Sprite_Character.prototype.characterPatternY;
  Sprite_Character.prototype.characterPatternY = function() {
    if (this._character.isQCharacter()) {
      var pose = this._character._qSprite.poses[this._character._pose];
      if (!pose) return 0;
      var pattern = pose.pattern;
      var i = pattern[this._character._pattern];
      var x = i % this._character._qSprite.cols;
      var y = (i - x) / this._character._qSprite.cols;
      return y;
    }
    return Alias_Sprite_Character_characterPatternY.call(this);
  };

  var Alias_Sprite_Character_patternWidth = Sprite_Character.prototype.patternWidth;
  Sprite_Character.prototype.patternWidth = function() {
    if (this._character.isQCharacter()) {
      return this.bitmap.width / this._character._qSprite.cols;
    }
    return Alias_Sprite_Character_patternWidth.call(this);
  };

  var Alias_Sprite_Character_patternHeight = Sprite_Character.prototype.patternHeight;
  Sprite_Character.prototype.patternHeight = function() {
    if (this._character.isQCharacter()) {
      return this.bitmap.height / this._character._qSprite.rows;
    }
    return Alias_Sprite_Character_patternHeight.call(this);
  };

  //-----------------------------------------------------------------------------
  // Sprite_Actor
  //
  // The sprite for displaying an actor.

  Sprite_Actor.prototype.isQCharacter = function() {
    if (this._isQChara === undefined) {
      this._isQChara = this._battlerName.match(/^#(.+?)-/);
    }
    return this._isQChara ? this._isQChara[1] : false;
  };

  var Alias_Sprite_Actor_startMotion = Sprite_Actor.prototype.startMotion;
  Sprite_Actor.prototype.startMotion = function(motionType) {
    if (this.isQCharacter()) {
      var pose = motionType;
      var motion = this._qSprite.poses[pose];
      if (motion) {
        this._pose = pose;
        this._pattern = 0;
        this._motionCount = 0;
      }
    } else {
      Alias_Sprite_Actor_startMotion.call(this, motionType);
    }
  };


  var Alias_Sprite_Actor_updateBitmap = Sprite_Actor.prototype.updateBitmap;
  Sprite_Actor.prototype.updateBitmap = function() {
    var oldBattlerName = this._battlerName;
    Alias_Sprite_Actor_updateBitmap.call(this);
    if (oldBattlerName !== this._battlerName) {
      this._isQChara = undefined;
      if (this.isQCharacter()) {
        this._qSprite = QuasiSprite.json[this.isQCharacter()];
      }
    }
  };

  var Alias_Sprite_Actor_updateFrame = Sprite_Actor.prototype.updateFrame;
  Sprite_Actor.prototype.updateFrame = function() {
    if (this.isQCharacter()) {
      Sprite_Battler.prototype.updateFrame.call(this);
      var bitmap = this._mainSprite.bitmap;
      if (bitmap) {
        var motion = this._qSprite.poses[this._pose];
        if (!motion) {
          this._mainSprite.visible = false;
          return;
        }
        this._mainSprite.visible = true;
        var pattern = motion.pattern;
        var i = pattern[this._pattern];
        var cw = bitmap.width / this._qSprite.cols;
        var ch = bitmap.height / this._qSprite.rows;
        var cx = i % this._qSprite.cols;
        var cy = (i - cx) / this._qSprite.cols;
        this._mainSprite.setFrame(cx * cw, cy * ch, cw, ch);
      }
    } else {
      Alias_Sprite_Actor_updateFrame.call(this);
    }
  };

  var Alias_Sprite_Actor_updateMotionCount = Sprite_Actor.prototype.updateMotionCount;
  Sprite_Actor.prototype.updateMotionCount = function() {
    if (this.isQCharacter()) {
      var motion = this._qSprite.poses[this._pose];
      if (!motion) return;
      var poseWait = motion.speed;
      if (++this._motionCount >= poseWait) {
        this._pattern++;
        var maxPattern = motion.pattern.length;
        if (this._pattern === maxPattern) {
          this.refreshMotion();
        }
        this._motionCount = 0;
      }
    } else {
      Alias_Sprite_Actor_updateMotionCount.call(this);
    }
  };

  var Alias_Sprite_Actor_refreshMotion = Sprite_Actor.prototype.refreshMotion;
  Sprite_Actor.prototype.refreshMotion = function() {
    if (this.isQCharacter()) {
      var actor = this._actor;
      if (actor) {
        var stateMotion = actor.stateMotionIndex();
        if (actor.isInputting()) {
          this.startMotion('idle2');
        } else if (actor.isActing()) {
          this.startMotion('walk');
        } else if (stateMotion === 3) {
          this.startMotion('dead');
        } else if (stateMotion === 2) {
          this.startMotion('sleep');
        } else if (actor.isChanting()) {
          this.startMotion('chant');
        } else if (actor.isGuard() || actor.isGuardWaiting()) {
          this.startMotion('guard');
        } else if (stateMotion === 1) {
          this.startMotion('abnormal');
        } else if (actor.isDying()) {
          this.startMotion('dying');
        } else if (actor.isUndecided()) {
          this.startMotion('idle1');
        } else {
          this.startMotion('idle2');
        }
      }
    } else {
      Alias_Sprite_Actor_refreshMotion.call(this);
    }
  };

if (Imported.YEP_X_ActSeqPack2) {
  var Alias_Sprite_Actor_forceMotion = Sprite_Actor.prototype.forceMotion;
  Sprite_Actor.prototype.forceMotion = function(motionType) {
    if (this.isQCharacter()) {
      var pose = motionType;
      var motion = this._qSprite.poses[pose];
      if (motion) {
        this._pose = pose;
        this._pattern = 0;
        this._motionCount = 0;
      }
    } else {
      Alias_Sprite_Actor_forcetMotion.call(this, motionType);
    }
  };

  var Alias_BattleManager_processActionSequence = BattleManager.processActionSequence;
  BattleManager.processActionSequence = function(actionName, actionArgs) {
    if (actionName.match(/QMOTION[ ](.*)/i)) {
      return this.actionQMotionTarget(String(RegExp.$1), actionArgs);
    }
    return Alias_BattleManager_processActionSequence.call(this, actionName, actionArgs);
  };

  BattleManager.actionQMotionTarget = function(name, actionArgs) {
    var movers = this.makeActionTargets(actionArgs[0]);
    if (movers.length < 1) return true;
    var motion = name.toLowerCase();
    movers.forEach(function(mover) {
      mover.forceMotion(motion);
    });
    return false;
  };
}
  //-----------------------------------------------------------------------------
  // Game_Actor
  //
  // The game object class for an actor.

  var Alias_Game_Actor_performAction = Game_Actor.prototype.performAction;
  Game_Actor.prototype.performAction = function(action) {
    Alias_Game_Actor_performAction.call(this, action);
    if (action._item._dataClass === "skill") {
      var id = action._item._itemId;
      var skill = $dataSkills[id];
      var motion = skill.meta.motion;
      if (motion) {
        this.requestMotion(motion);
      }
    }
  };
})(QuasiSprite);