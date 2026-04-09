package expo.modules.cineversefs

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class CineverseFsModule : Module() {

  companion object {
    private const val CHANNEL_ID   = "cineverse_downloads"
    private const val CHANNEL_NAME = "CINEVERSE Downloads"
    private const val ACCENT_TEAL  = "#13CFCF"
    private const val ACCENT_GREEN = "#22c55e"
  }

  private fun ctx() = appContext.reactContext

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val c = ctx() ?: return
      val mgr = c.getSystemService(NotificationManager::class.java) ?: return
      if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
        val ch = NotificationChannel(
          CHANNEL_ID,
          CHANNEL_NAME,
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = "Shows download progress for CINEVERSE"
          setSound(null, null)
          enableVibration(false)
          enableLights(false)
        }
        mgr.createNotificationChannel(ch)
      }
    }
  }

  private fun smallIcon(): Int {
    val c = ctx() ?: return android.R.drawable.stat_sys_download
    val res = c.resources.getIdentifier("notification_icon", "drawable", c.packageName)
    return if (res != 0) res else android.R.drawable.stat_sys_download
  }

  private fun launchIntent(): PendingIntent? {
    val c    = ctx() ?: return null
    val open = c.packageManager.getLaunchIntentForPackage(c.packageName) ?: return null
    open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(c, 0, open, flags)
  }

  override fun definition() = ModuleDefinition {

    Name("CineverseFs")

    // ── makeDirectoryAsync ────────────────────────────────────────────────────
    AsyncFunction("makeDirectoryAsync") { path: String ->
      val dir = File(path)
      if (!dir.exists()) {
        val ok = dir.mkdirs()
        if (!ok && !dir.exists()) throw Exception("Failed to create directory: $path")
      }
    }

    // ── moveFileAsync ─────────────────────────────────────────────────────────
    AsyncFunction("moveFileAsync") { from: String, to: String ->
      val src  = File(from)
      val dest = File(to)
      if (!src.exists()) throw Exception("Source file not found: $from")
      dest.parentFile?.let { if (!it.exists()) it.mkdirs() }
      val renamed = src.renameTo(dest)
      if (!renamed) { copyStream(src, dest); src.delete() }
    }

    // ── copyFileAsync ─────────────────────────────────────────────────────────
    AsyncFunction("copyFileAsync") { from: String, to: String ->
      val src  = File(from)
      val dest = File(to)
      if (!src.exists()) throw Exception("Source file not found: $from")
      dest.parentFile?.let { if (!it.exists()) it.mkdirs() }
      copyStream(src, dest)
    }

    // ── deleteAsync ───────────────────────────────────────────────────────────
    AsyncFunction("deleteAsync") { path: String ->
      val file = File(path)
      if (file.exists()) file.deleteRecursively()
    }

    // ── getExternalStoragePath ────────────────────────────────────────────────
    Function("getExternalStoragePath") {
      android.os.Environment.getExternalStorageDirectory().absolutePath
    }

    // ── existsSync ────────────────────────────────────────────────────────────
    Function("existsSync") { path: String -> File(path).exists() }

    // ── postProgressNotification ──────────────────────────────────────────────
    // Shows a sticky notification with a native Android progress bar.
    // progress: 0-100, or -1 for indeterminate.
    // downloadedBytes / totalBytes: used to build the size subtitle.
    AsyncFunction("postProgressNotification") { notifId: Int, label: String, downloadedBytes: Long, totalBytes: Long, progress: Int ->
      val ctx = ctx() ?: return@AsyncFunction
      ensureChannel()

      val isIndeterminate = progress < 0
      val actualProgress  = if (isIndeterminate) 0 else progress.coerceIn(0, 100)

      // Size line shown below the title, on its own line, above the progress bar.
      val sizeText = if (totalBytes > 0) {
        val dlMB    = String.format("%.1f", downloadedBytes / (1024.0 * 1024.0))
        val totalMB = String.format("%.1f", totalBytes / (1024.0 * 1024.0))
        "$dlMB MB / $totalMB MB"
      } else {
        "Downloading\u2026"
      }

      val notif = NotificationCompat.Builder(ctx, CHANNEL_ID)
        .setSmallIcon(smallIcon())
        .setContentTitle(label)          // episode / movie name as the bold title
        .setContentText(sizeText)        // size info on a separate line, before the progress bar
        .setSubText("Downloading")       // small text in the notification header
        .setColor(Color.parseColor(ACCENT_TEAL))
        .setColorized(true)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setProgress(100, actualProgress, isIndeterminate)
        .setSilent(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setContentIntent(launchIntent())
        .build()

      NotificationManagerCompat.from(ctx).notify(notifId, notif)
    }

    // ── postCompleteNotification ──────────────────────────────────────────────
    // Shows a completion notification with a "Play" action button.
    AsyncFunction("postCompleteNotification") { notifId: Int, label: String ->
      val ctx = ctx() ?: return@AsyncFunction
      ensureChannel()

      val openIntent = launchIntent()

      val playAction = openIntent?.let {
        NotificationCompat.Action.Builder(
          android.R.drawable.ic_media_play,
          "▶  Play",
          it
        ).build()
      }

      val builder = NotificationCompat.Builder(ctx, CHANNEL_ID)
        .setSmallIcon(smallIcon())
        .setContentTitle("Download successfully")
        .setContentText(label)
        .setColor(Color.parseColor(ACCENT_GREEN))
        .setColorized(true)
        .setAutoCancel(true)
        .setSilent(true)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setContentIntent(openIntent)

      if (playAction != null) builder.addAction(playAction)

      NotificationManagerCompat.from(ctx).notify(notifId, builder.build())
    }

    // ── cancelNotification ────────────────────────────────────────────────────
    AsyncFunction("cancelNotification") { notifId: Int ->
      val ctx = ctx() ?: return@AsyncFunction
      NotificationManagerCompat.from(ctx).cancel(notifId)
    }
  }

  private fun copyStream(src: File, dest: File) {
    FileInputStream(src).use { input ->
      FileOutputStream(dest).use { output ->
        val buf = ByteArray(1024 * 1024)
        var n: Int
        while (input.read(buf).also { n = it } != -1) output.write(buf, 0, n)
        output.flush()
      }
    }
  }
}
