import {
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    useFonts as useBarlowFonts,
} from "@expo-google-fonts/barlow-condensed";
import {
    IBMPlexMono_400Regular,
    useFonts as useIBMMonoFonts,
} from "@expo-google-fonts/ibm-plex-mono";
import {
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    useFonts as useIBMSansFonts,
} from "@expo-google-fonts/ibm-plex-sans";

/**
 * Loads all icon / display fonts used by Freelance OS.
 * Returns [loaded, error] — matches the expo-font useFonts signature so
 * callers can gate rendering until fonts are ready.
 */
export function useIconFonts(): [boolean, Error | null] {
    const [barlowLoaded, barlowError] = useBarlowFonts({
        BarlowCondensed_600SemiBold,
        BarlowCondensed_700Bold,
    });
    const [ibmSansLoaded, ibmSansError] = useIBMSansFonts({
        IBMPlexSans_400Regular,
        IBMPlexSans_500Medium,
        IBMPlexSans_600SemiBold,
    });
    const [ibmMonoLoaded, ibmMonoError] = useIBMMonoFonts({
        IBMPlexMono_400Regular,
    });

    const loaded = barlowLoaded && ibmSansLoaded && ibmMonoLoaded;
    const error = barlowError || ibmSansError || ibmMonoError || null;

    return [loaded, error];
}
