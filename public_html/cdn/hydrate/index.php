<?php

const PATH = "../node_modules/hydrate-web/index.js";
$myfile = fopen(PATH, "r") or die("/* Error */");
echo fread($myfile, filesize(PATH));
fclose($myfile);