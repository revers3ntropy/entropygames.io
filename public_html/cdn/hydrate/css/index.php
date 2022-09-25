<?php

header('content-type', 'text/css; charset=UTF-8');

const PATH = "../node_modules/entropy-hydrate/index.css";
$myfile = fopen(PATH, "r") or die("/* Error */");
echo fread($myfile, filesize(PATH));
fclose($myfile);