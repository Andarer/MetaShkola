# Proguard rules for MetaSchool 2.0
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class org.metaschool.app.MetaSchoolNativeBridge { *; }
-dontwarn androidx.webkit.**
