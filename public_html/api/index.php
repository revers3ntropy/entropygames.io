<?php
/* For debugging:
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', true);
error_reporting(E_ALL);
//*/
require_once 'loadenv.php';

use Env\DotEnv;

(new DotEnv(__DIR__ . '/.env'))->load();

$start = floor(microtime(true) * 1000);

$uri_parts = explode("?", $_SERVER['REQUEST_URI'], 2);

$api_uri = '';

if (count($uri_parts) == 2) {
	$api_uri = $uri_parts[1];
} else {
	die(json_encode(array('error' => "Invalid API request format, must have '?' followed by API route")));
}

$url = getenv('HOST').':'.getenv('PORT').'/'.$api_uri;

$ch = curl_init();

/* Support for POST requests */
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    curl_setopt($ch, CURLOPT_POST, TRUE);
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_HEADER, TRUE);

$headers = getallheaders();

/* Translate some headers to make the remote party think we're actually browsing that site */
$extraHeaders = array();

/* Forward cookie as it came */
curl_setopt($ch, CURLOPT_HTTPHEADER, $extraHeaders);
if (isset($headers['Cookie'])) {
    curl_setopt($ch, CURLOPT_COOKIE, $headers['Cookie']);
}
curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Dangerous but as only localhost requests should be fine
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);

if ($response === false)  {
	die(json_encode(array('error' => curl_error($ch), 'status' => 502)));
}

$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $header_size);
$body = substr($response, $header_size);

$headerArray = explode(PHP_EOL, $headers);

/* Process response headers. */
foreach($headerArray as $header)
{
    $colonPos = strpos($header, ':');
    if ($colonPos !== FALSE)
    {
        $headerName = substr($header, 0, $colonPos);

        /* Ignore content headers, let the webserver decide how to deal with the content. */
        if (trim($headerName) == 'Content-Encoding') continue;
        if (trim($headerName) == 'Content-Length') continue;
        if (trim($headerName) == 'Transfer-Encoding') continue;
        if (trim($headerName) == 'Location') continue;
    }
    header($header, FALSE);
}

curl_close($ch);

header('Internal-Request-Time: '.strval(floor(microtime(true) * 1000)- $start).'ms');

echo $body;