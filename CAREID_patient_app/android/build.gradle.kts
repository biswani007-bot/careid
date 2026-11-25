allprojects {
    repositories {
        google()
        mavenCentral()
    }

    // Force all subprojects to use the Kotlin version cached locally (2.4.0).
    // This prevents image_picker_android from requesting kotlin-gradle-plugin:2.3.20
    // which is absent from the offline Gradle cache.
    configurations.all {
        resolutionStrategy.eachDependency {
            if (requested.group == "org.jetbrains.kotlin") {
                useVersion("2.4.0")
                because("Pin all Kotlin deps to cached version 2.4.0 to avoid network fetch of 2.3.20")
            }
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
