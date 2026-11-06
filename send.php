<?php
/* ===================== Відправка заявки з сайту на пошту ===================== */

$TO   = 'vsschoolif@gmail.com';
$FROM = 'noreply@vsschool.com.ua';

/* ---------- Ліміти ---------- */
$PER_IP_WINDOW = 600;   // секунд
$PER_IP_MAX    = 3;     // заявок з однієї адреси за вікно
$PER_DAY_MAX   = 60;    // заявок з усього сайту за добу
$MIN_FILL_MS   = 3000;  // мінімальний час заповнення форми

date_default_timezone_set('Europe/Kyiv');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function done($ok, $code = 200) { http_response_code($code); echo json_encode(['ok' => $ok]); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') done(false, 405);

/* ---------- Захист від ботів ---------- */
if (!empty($_POST['website'])) done(true);
$elapsed = (int)($_POST['elapsed'] ?? 0);
if ($elapsed < $MIN_FILL_MS) done(true);

/* ---------- Дані форми ---------- */
function clean($v, $max) {
  $v = trim((string)($v ?? ''));
  $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v);
  return mb_substr(strip_tags($v), 0, $max, 'UTF-8');
}

$name  = clean($_POST['name']  ?? '', 100);
$phone = clean($_POST['phone'] ?? '', 30);
$grade = clean($_POST['grade'] ?? '', 40);

if ($name === '' || strlen(preg_replace('/\D/', '', $phone)) < 9 || !preg_match('/^[\d\s()+\-]+$/', $phone)) done(false, 422);

/* ---------- Захист від флуду ---------- */
$dir = __DIR__ . '/_data';
if (!is_dir($dir)) { @mkdir($dir, 0750, true); @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n"); }
$log = $dir . '/rate.json';
$fp = @fopen($log, 'c+');
if ($fp) {
  flock($fp, LOCK_EX);
  $raw = stream_get_contents($fp);
  $data = json_decode($raw ?: '{}', true) ?: [];
  $now = time();
  $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|vs');
  $hits = array_values(array_filter($data['ip'][$ip] ?? [], fn($t) => $t > $now - $PER_IP_WINDOW));
  $day = array_values(array_filter($data['day'] ?? [], fn($t) => $t > $now - 86400));
  if (count($hits) >= $PER_IP_MAX || count($day) >= $PER_DAY_MAX) {
    flock($fp, LOCK_UN); fclose($fp); done('slow', 429);
  }
  $hits[] = $now; $day[] = $now;
  foreach (($data['ip'] ?? []) as $k => $v) if (max($v) < $now - $PER_IP_WINDOW) unset($data['ip'][$k]);
  $data['ip'][$ip] = $hits; $data['day'] = $day;
  ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($data));
  flock($fp, LOCK_UN); fclose($fp);
}

$subject = '=?UTF-8?B?' . base64_encode('Нова заявка з сайту: ' . $grade) . '?=';
$body  = "Нова заявка з сайту VS School\n\n";
$body .= "Ім'я: $name\n";
$body .= "Телефон: $phone\n";
$body .= "Клас: $grade\n";
$body .= "Час: " . date('d.m.Y H:i') . "\n";

$headers  = "From: VS School <$FROM>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

$sent = @mail($TO, $subject, $body, $headers, '-f' . $FROM);
done($sent, $sent ? 200 : 500);
