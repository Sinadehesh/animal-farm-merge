package com.sinadehesh.mergefarmstead;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ConsentModePlugin.class); // the app's own plugin: before the bridge starts
        super.onCreate(savedInstanceState);
        // The game's words are sized to fit its pictures and buttons. Left alone, Android
        // makes them bigger with the phone's "font size" setting (up to twice as big) and
        // they spill out of their buttons: keep them as drawn.
        if (bridge != null && bridge.getWebView() != null) bridge.getWebView().getSettings().setTextZoom(100);
    }
}
