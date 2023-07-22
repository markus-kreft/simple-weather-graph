<?php
$user_agent = "simple-weather-graph github.com/elg3a/simple-weather-graph";
$apiurl = "https://api.met.no/weatherapi/locationforecast/2.0/compact?";
$cache_dir = "./cache";
$geonames_db_file = "./cities500.sqlite";
// cheack all files in cache on each load
// -> this does not scale but works for small numbers of different locations
$cached_files = array_diff(scandir($cache_dir), array(".", ".."));
foreach($cached_files as $file) {
    if (time() - filemtime($cache_dir."/".$file) > 60 * 60) {
        unlink($cache_dir."/".$file);
    }
}
// parse url query string
$loc = htmlspecialchars($_GET["loc"] ?? "");
$lat = htmlspecialchars($_GET["lat"] ?? "");
$long = htmlspecialchars($_GET["long"] ?? "");
$el = htmlspecialchars($_GET["el"] ?? "");
$location_picker = $error_msg = $chart = False;
if ($loc=="" and $lat=="" and $long=="" and $el=="") {
    $loc = "Berlin, DE";
    $lat = "52.52437";
    $long = "13.41053";
    $el = "74";
    $chart = True;
} elseif ($lat!="" and $long!="") {
    $chart = True;
} elseif ($lat=="" xor $long=="") {
    $error_msg = "If using coordinates, both lat and long need to be provided.";
} elseif ($loc!="") {
    $db = new SQLite3($geonames_db_file);
    $results = $db->query(
        "SELECT * FROM cities500 WHERE lower(name) = '".strtolower($loc)
        ."' OR lower(asciiname) = '".strtolower($loc)."'"
    );
    $num_results = 0;
    while($rows = $results->fetchArray(SQLITE3_ASSOC)) {
        ++$num_results;
    }
    if ($num_results == 0) {
        $error_msg = "Location ".$loc." is unknown.";
    } elseif ($num_results == 1) {
        $row = $results->fetchArray(SQLITE3_ASSOC);
        $loc = $row["name"].", ".$row["country code"];
        $lat = $row["latitude"];
        $long = $row["longitude"];
        $el =  $row["elevation"];
        $chart = True;
    } else {
        $location_picker = True;
    }
}
?><!DOCTYPE html>
<html lang="en">
<head>
    <title>Weather</title> 
    <meta charset="UTF-8">
<?php if ($error_msg or $location_picker): ?>
    <meta name="viewport" content="width=device-width, initial-scale=1">
<?php endif; ?>
    <link rel="stylesheet" type="text/css" href="style.css">
    <script src="./Chart-2.7.2.min.js"></script>
</head>
<body>
<?php if ($error_msg): ?>
    <div id="error" style="text-align: center; color: #ffffff; margin:0 auto;">
        <?php echo $error_msg; ?>
    </div>
<?php elseif ($location_picker): ?>
    <div id="location-picker" style="text-align: center; color: #ffffff; margin:0 auto;">
    <ul>
    <?php while( $row = $results->fetchArray(SQLITE3_ASSOC) ): ?>
        <li><?= "<a href='index.php?"
            ."loc=".urlencode($row["name"].", ".$row["country code"])
            ."&lat=".urlencode($row["latitude"])
            ."&long=".urlencode($row["longitude"])
            ."&el=".urlencode($row["elevation"])
            ."'>".$row["name"].", ".$row["country code"]; ?></a></li>
    <?php endwhile; ?>
    </ul>
    </div>
<?php elseif ($chart):
    // lat and long are definitely available and el/loc may be
    // Round to 4 decimal places: https://developer.yr.no/doc/GettingStarted/
    $lat = sprintf("%.4f", floatval($lat));
    $long = sprintf("%.4f", floatval($long));

    // check cache and get data
    $location = "lat=".$lat."&lon=".$long;
    if ($el!="") {
        $location .= "&altitude=".$el;
    }
    // just to be sure remove "/" from filename
    $local_filename = $cache_dir."/".str_replace("/", "", $location).".json";
    // it is not actually necessary to check the cache age again
    if (file_exists($local_filename)) {
        $status = "Weather data was not updated.";
    } else {
        ini_set('user_agent', $user_agent);
        $content = file_get_contents($apiurl . $location);
        file_put_contents($local_filename, $content);
        $status = "Weather data was updated.";
    }
?>
    <canvas id="chart" style="width:100%; height:100%; max-width:1100px; max-height:300px">Sorry, your browser is not supported.</canvas>
    <div id="status" style="position: absolute; left: 0%; top: 0%; color: #ffffff;"><?php echo $status; ?></div>
    <script>
        var url = "<?php echo $local_filename; ?>";
        var city = "<?php echo $loc; ?>";
    </script>
    <script src="script.js"></script>
<?php endif; ?>
</body>
</html>
