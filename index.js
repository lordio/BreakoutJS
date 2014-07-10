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
    el: $('#paddle'),
    speed: 1.5
  };
  paddle.maxPos = {
    x: game.dims.x + game.dims.width - paddle.el.width()
  };
  
  //ditto ball
  var ball = {
    el: $('#ball'),
    vel: { //could hide this, but public makes certain things easier to implement.
      x: 1.5,
      y: 1.5
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
      ball.vel.x *= -1; //easier to use explicit reference to ball, rather than bind()
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
  
  var loop = new (function() {
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
  })();
  
  var $score = $('#score');
  function addScore(pts) {
    score += pts;
    $score.html('Score: ' + score);
  }
  
  var bricks;
  function placeBricks() {
    for(var x = 0; x < 6; ++x) {
      bricks.push([]);
      for(var y = 0; y < 6; ++y) {
        var b = {
          el: $('<div class="brick"></div>'), 
          active: true, 
          value: 150 - (y * 25)
        };
        b.el.insertAfter(ball.el);
        b.el.offset({
          top: 30 + game.dims.y + (y * b.el.height()), 
          left: 20 + game.dims.x + (x * b.el.width())
        });
        bricks[x].push(b);
      }
    }
  }
  function initGame() {
    loop.stop();
    
    bricks = [];
    
    ball.el.offset({
      top: game.dims.y + 235,
      left: game.dims.x + 315
    });
    ball.vel.x = 1.5;
    ball.vel.y = 1.5;
    
    paddle.el.offset({
      top: game.dims.y + 400,
      left: game.dims.x + 260
    });
    
    placeBricks();
  }
  initGame();
  
  function centerOf(el) {
    return {
      x: el.offset().left + (el.width() / 2),
      y: el.offset().top + (el.height() / 2)
    };
  }
  
  function collide(a, b) {
    var ac = centerOf(a);
    var bc = centerOf(b);
    return (((Math.abs(ac.x - bc.x) * 2) <= (a.width() + b.width())) &&
      ((Math.abs(ac.y - bc.y) * 2) <= (a.height() + b.height())));
  }
  
  function frameLoop() {
    //update and constrain paddle
    var pos = paddle.el.offset();
    if(arrow.left) pos.left -= paddle.speed;
    if(arrow.right) pos.left += paddle.speed;
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
    
    //move the ball based on its velocity
    pos.left += ball.vel.x;
    pos.top += ball.vel.y;
    
    //constrain the ball to the screen
    if(pos.left < game.dims.x || pos.left > ball.maxPos.x) ball.reflect.x();
    if(pos.top < game.dims.y) ball.reflect.y();
    else if(pos.top > ball.maxPos.y) {
      loop.stop();
      return;
    }
    
    //check for collision between the ball and paddle
    if((ball.el.offset().top + ball.el.height() >= paddle.el.offset().top) && collide(ball.el, paddle.el)) {
      directionalCollide(paddle.el, null, {
        x: function() {},
        y: function() {
          //get the ball's velocity vector length
          var sl = Math.sqrt((ball.vel.x * ball.vel.x) + (ball.vel.y * ball.vel.y));
          
          var bc = centerOf(ball.el);
          var pc = centerOf(paddle.el);
          
          //calculate the impact vector, and normalize it
          var iv = {
            x: bc.x - pc.x,
            y: bc.y - pc.y
          };
          var il = Math.sqrt((iv.x * iv.x) + (iv.y * iv.y)) / sl;
          iv.x /= il;
          iv.y /= il;
          
          //add the ball velocity vector and the impact vector, and normalize that.
          var nv = {
            x: ball.vel.x + iv.x,
            y: ball.vel.y + iv.y
          };
          var nl = Math.sqrt((nv.x * nv.x) + (nv.y * nv.y)) / sl;
          nv.x /= nl;
          nv.y /= nl;
          
          //set the ball's velocity to the new vector.
          ball.vel.x = nv.x;
          ball.vel.y = nv.y;
      }});
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
          addScore(br.value);
          br.active = false;
          br.el.remove();
        }
      }
    }
    if(!bricksRemain) {
      initGame();
      return;
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
