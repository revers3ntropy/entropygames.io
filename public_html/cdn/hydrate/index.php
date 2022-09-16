<?php

header('content-type', 'application/javascript; charset=UTF-8');

const PATH = "../node_modules/hydrate-web/index.js";
$myfile = fopen(PATH, "r") or die("/* Error */");
echo fread($myfile, filesize(PATH));
fclose($myfile);