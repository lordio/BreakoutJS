$(function() {
  var $game = $("#game");
  $game.offset({ //reposition the game to the middle of the user's browser window.
    top: ($(window).innerHeight() - $game.height()) / 2, 
    left: ($(window).innerWidth() - $game.width()) / 2
  });
  var g = {x: $game.offset().left, y: $game.offset().top, w: $game.width(), h: $game.height()};
  var $paddle = $("#paddle");
  var padMaxX = g.x + g.w - $paddle.width();
  var $ball = $("#ball");
  var ballMax = {x: g.x + g.w - $ball.width(), y: g.y + g.h - $ball.height()};
  var arrow = {left: false, right: false};
  var bv = {x: 1, y: 1};
  var loop; //loop starts out as null, so game starts paused.
  
  function collide(a, b) {
    var ac = {
      x: a.offset().left + (a.width() / 2), 
      y: a.offset().top + (a.height() / 2)
    };
    var bc = {
      x: b.offset().left + (b.width() / 2), 
      y: b.offset().top + (b.height() / 2)
    };
    return (((Math.abs(ac.x - bc.x) * 2) <= (a.width() + b.width())) &&
      ((Math.abs(ac.y - bc.y) * 2) <= (a.height() + b.height())));
  }
  
  function frameLoop() {
    //update and constrain paddle
    var pos = $paddle.offset();
    if(arrow.left) pos.left--;
    if(arrow.right) pos.left++;
    if(pos.left < g.x) pos.left = g.x;
    if(pos.left > padMaxX) pos.left = padMaxX;
    $paddle.offset(pos);
    
    //update, constrain, and collide ball
    pos = $ball.offset();
    pos.left += bv.x;
    pos.top += bv.y;
    if(pos.left < g.x || pos.left > ballMax.x) bv.x *= -1;
    if(pos.top < g.y) bv.y *= -1;
    else if(pos.top > ballMax.y) {
      //window.cancelAnimationFrame(loop);
      //loop = null;
      //return;
      bv.y *= -1;
    }
    if(collide($ball, $paddle)) {
      bv.y *= -1;
      pos.top = $paddle.offset().top - $ball.height() + bv.y;
    }
    $ball.offset(pos);
    
    loop = window.requestAnimationFrame(frameLoop);
  }
  
  $(window).keydown(function(evt) {
    switch(evt.which) {
    case 0x50: //'p' key
      if(loop) { //pause the game by canceling the frame loop
        window.cancelAnimationFrame(loop);
        loop = null;
      } else { //unpause the game by restarting the game loop
        loop = window.requestAnimationFrame(frameLoop);
      }
      break;
    case 0x25: //left arrow
      arrow.left = true;
      break;
    case 0x27: //right arrow
      arrow.right = true;
      break;
    }
  });
  $(window).keyup(function(evt) {
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
