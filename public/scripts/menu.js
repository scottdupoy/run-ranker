$(function() {
  // make the whole link areas clickable
  $('li.navLink').click(function() {
    console.log('link clicked');
    window.location = $('a', this).attr('href');
    return false;
  });
});

