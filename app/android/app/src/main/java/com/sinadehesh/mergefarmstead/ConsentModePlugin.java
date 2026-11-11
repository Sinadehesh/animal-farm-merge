package com.sinadehesh.mergefarmstead;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * What the game reads before it turns Google Analytics on: whether this build has
 * the Firebase file at all, and what Google's consent form (the UMP SDK, shown by
 * the AdMob plugin) decided for consent mode.
 *
 * analytics: the build was made with app/android/app/google-services.json (the
 * google-services plugin turns it into the google_app_id text). Without it the
 * game never calls Firebase.
 *
 * The UMP SDK writes UMP_consentModeValues to the app's default preferences: four
 * digits, for ad_storage, ad_user_data, ad_personalization and analytics_storage.
 * 0 = no value yet, 1 = granted, 2 = denied, 3 = consent mode doesn't apply to this
 * user, 4 = not configured (Privacy & messaging in AdMob).
 * See https://developers.google.com/funding-choices/fc-sdks#consent_mode_basic_mode_support
 */
@CapacitorPlugin(name = "ConsentMode")
public class ConsentModePlugin extends Plugin {

    @PluginMethod
    public void get(PluginCall call) {
        String values = "";
        boolean analytics = false;
        try {
            Context context = getContext();
            analytics = context.getResources().getIdentifier("google_app_id", "string", context.getPackageName()) != 0;
            SharedPreferences prefs = context.getSharedPreferences(context.getPackageName() + "_preferences", Context.MODE_PRIVATE);
            values = prefs.getString("UMP_consentModeValues", "");
        } catch (Exception e) {
            // Not there, or not text: the game treats it as "no value".
        }
        JSObject result = new JSObject();
        result.put("analytics", analytics);
        result.put("values", values == null ? "" : values);
        call.resolve(result);
    }
}
