<?php

header('content-type', 'text/css; charset=UTF-8');

const PATH = "../node_modules/hydrate-web/index.css";
$myfile = fopen(PATH, "r") or die("/* Error */");
echo fread($myfile, filesize(PATH));
fclose($myfile);