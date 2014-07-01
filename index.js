$(function() {
  //initialize game state
  var score = 0;
  var arrow = {
    left: false, 
    right: false
  };
  
  //cache jquery-ed window
  var $window = $(window);
  var game = {
    el: $('#game'), 
  };
  game.dims = {
    x: game.el.offset().left,
    y: game.el.offset().top,
    width: game.el.width(),
    height: game.el.height()
  };
  
  //gather all paddle-relevant information in one object
  var paddle = {
    el: $('#paddle')
  };
  paddle.maxPos = {
    x: game.dims.x + game.dims.width - paddle.el.width()
  };
  
  //ditto ball
  var ball = {
    el: $('#ball'),
    vel: { //could hide this, but public makes certain things easier to implement.
      x: 1,
      y: 1
    }
  };
  ball.maxPos = {
    //cache maximum x, where it will bounce off the right wall
    //  minimum x is easy: it's 0.
    x: game.dims.x + game.dims.width - ball.el.width(),
    y: game.dims.y + game.dims.height - ball.el.height()
  };
  ball.reflect = { //some simple helper functions for common operations.
    x: function() {
      ball.vel.x *= -1; //can't say 'this'; would refer to ball.reflect, not ball.
    },
    y: function() {
      ball.vel.y *= -1;
    }
  };
  
  $window.resize(function(evt) {
    //update everything that depends on the game's x and y values here
    game.dims.x = ($window.innerWidth() - game.dims.width) / 2;
    game.dims.y = ($window.innerHeight() - game.dims.height) / 2;
    
    paddle.maxPos.x = game.dims.x + game.dims.width - paddle.el.width();
    
    ball.maxPos.x = game.dims.x + game.dims.width - ball.el.width();
    ball.maxPos.y = game.dims.y + game.dims.height - ball.el.height();
    
    game.el.offset({ //reposition the game to the middle of the user's browser window.
      top: game.dims.y, 
      left: game.dims.x
    });
  });
  $window.resize();
  
  var bricks = [];
  for(var x = 0; x < 6; ++x) {
    bricks.push([]);
    for(var y = 0; y < 6; ++y) {
      var b = {
        el: $('<div class="brick"></div>'), 
        active: true, 
        value: 150 - (y * 25)
      };
      b.el.offset({
        top: 30 + (y * b.el.height()), 
        left: 20 + (x * b.el.width())
      });
      b.el.insertAfter(ball.el);
      bricks[x].push(b);
    }
  }
  
  //loop is an object of anonymous type that hides state information
  var loop = new function() {
    //hide state from modification other than through specified interface
    var state = null;
    this.next = function() {
      //frameLoop is hoisted, and this method won't be used until frameLoop is defined
      state = window.requestAnimationFrame(frameLoop);
    }
    this.stop = function() {
      if(!state) return;
      window.cancelAnimationFrame(state);
      state = null;
    }
    this.toggle = function() {
      if(state) {
        this.stop();
      } else {
        this.next();
      }
    }
  }();
  
  function collide(a, b) {
    //attempt to cache function results to reduce calls
    var ao = a.offset();
    var ad = {
      width: a.width(), 
      height: a.height()
    };
    
    var bo = b.offset();
    var bd = {
      width: b.width(), 
      height: b.height()
    };
    
    var ac = {
      x: ao.left + (ad.width / 2), 
      y: ao.top + (ad.height / 2)
    };
    var bc = {
      x: bo.left + (bd.width / 2), 
      y: bo.top + (bd.height / 2)
    };
    return (((Math.abs(ac.x - bc.x) * 2) <= (ad.width + bd.width)) &&
      ((Math.abs(ac.y - bc.y) * 2) <= (ad.height + bd.height)));
  }
  
  function frameLoop() {
    //update and constrain paddle
    var pos = paddle.el.offset();
    if(arrow.left) pos.left--;
    if(arrow.right) pos.left++;
    if(pos.left < game.dims.x) pos.left = game.dims.x;
    if(pos.left > paddle.maxPos.x) pos.left = paddle.maxPos.x;
    paddle.el.offset(pos);
    
    //update, constrain, and collide ball
    pos = ball.el.offset();
    function directionalCollide(other, shouldCheck, onCollide) { //DRY.
      shouldCheck = shouldCheck || {
        x: true,
        y: true
      };
      onCollide = onCollide || {
        x: function() {},
        y: function() {}
      };
      var oldOff = {
        top: ball.el.offset().top,
        left: ball.el.offset().left
      };
      
      if(shouldCheck.y) {
        //undo vertical movement
        ball.el.offset({
          top: oldOff.top - ball.vel.y,
          left: oldOff.left
        });
        if(!collide(ball.el, other)) {
          ball.reflect.y();
          onCollide.y();
        }
      }
      if(shouldCheck.x) {
        //reset vertical, undo horizontal
        ball.el.offset({
          top: oldOff.top,
          left: oldOff.left - ball.vel.x
        });
        if(!collide(ball.el, other)) {
          ball.reflect.x();
          onCollide.x();
        }
      }
      
      //reset horizontal
      ball.el.offset(oldOff);
    }
    pos.left += ball.vel.x;
    pos.top += ball.vel.y;
    if(pos.left < game.dims.x || pos.left > ball.maxPos.x) ball.reflect.x();
    if(pos.top < game.dims.y) ball.reflect.y();
    else if(pos.top > ball.maxPos.y) {
      loop.stop();
      return;
    }
    if((ball.el.offset().top + ball.el.height() >= paddle.el.offset().top) && collide(ball.el, paddle.el)) {
      directionalCollide(paddle.el);
    }
    
    var bricksRemain = false;
    var hasReflected = {
      x: false,
      y: false
    };
    for(var x = 0; x < 6; ++x) {
      for(var y = 0; y < 6; ++y) {
        var br = bricks[x][y];
        
        //skip collision check under common conditions
        if(!br.active) {continue;}
        bricksRemain = true;
        
        if(br.el.offset().top + br.el.height() < ball.el.offset().top) {continue;}
        
        if(collide(br.el, ball.el)) {
          directionalCollide(
            br.el, 
            {x: !hasReflected.x, y: !hasReflected.y},
            {x: function() {hasReflected.x = true;}, y: function() {hasReflected.y = true;}}
          );
          
          //these occur whever there's a collision, regardless of direction.
          score += br.value;
          br.active = false;
          br.el.remove();
        }
      }
    }
    if(!bricksRemain) {
      loop.toggle();
    }
    ball.el.offset(pos);
    
    loop.next();
  }
  
  $window.keydown(function(evt) {
    //would use new standard evt.keyCode, but it's hardly supported at all
    switch(evt.which) {
    case 0x50: //'p' key
      loop.toggle();
      break;
    case 0x25: //left arrow
      arrow.left = true;
      break;
    case 0x27: //right arrow
      arrow.right = true;
      break;
    }
  });
  $window.keyup(function(evt) {
    switch(evt.which) {
    case 0x25: //left arrow
      arrow.left = false;
      break;
    case 0x27: //right arrow
      arrow.right = false;
      break;
    }
  });
});
