#include <iostream>
#include <fstream>
#include <filesystem>

#include <TFile.h>
#include <TKey.h>
#include <TH1.h>

#include "debug.hh"

using std::cout;
using std::endl;
namespace fs = std::filesystem;

template <typename T>
T* key_cast(TKey* key) { return dynamic_cast<T*>(key->ReadObj()); }
template <typename T>
T* key_cast(TObject* obj) { return dynamic_cast<T*>(obj); }
template <typename T>
const T* key_cast(const TObject* obj) { return dynamic_cast<const T*>(obj); }
TClass* get_class(const TKey* key) noexcept {
  return TClass::GetClass(key->GetClassName());
}
TClass* get_class(const TObject* obj) noexcept {
  return TClass::GetClass(obj->ClassName());
}
template <typename T>
bool inherits_from(const TClass* c) noexcept {
  return c->InheritsFrom(T::Class());
}

void traverse(const TDirectory* dir, const fs::path& path, int lvl=0) {
  fs::create_directories(path);
  for (TObject* item : *dir->GetListOfKeys()) {
    TKey* key = static_cast<TKey*>(item);
    const char* name = key->GetName();
    const TClass* c = get_class(key);
    for (int i=lvl; i; --i) cout << "  ";
    if (inherits_from<TDirectory>(c)) {
      cout << "\033[33m" << name << "\033[0m" << endl;
      traverse(key_cast<TDirectory>(key),path/name,lvl+1);
    } else if (inherits_from<TH1>(c)) {
      cout << "\033[34m" << name << "\033[0m" << endl;
      const TH1* h = key_cast<TH1>(key);
      const TAxis* axes[3] { };
      const int na = h->GetDimension();
      if (na>0) axes[0] = h->GetXaxis();
      if (na>1) axes[1] = h->GetYaxis();
      if (na>2) axes[2] = h->GetZaxis();
      std::ofstream f(path/(std::string(name)+".json"));
      f.precision(std::numeric_limits<double>::max_digits10);
      f << "{\n"
           "\"title\":" << std::quoted(h->GetTitle()) << ",\n"
           "\"labels\":[";
      for (int i=0;;) {
        f << std::quoted(axes[i]->GetTitle());
        if (++i==na) break;
        f << ',';
      }
      f << "],\n"
           "\"axes\":[\n";
      int nb[3] {1,1,1}, b[3] { };
      for (int i=0; i<na; ++i) {
        const TAxis* const a = axes[i];
        if (i) f << ',';
        const auto* bins = a->GetXbins();
        int n = bins->GetSize();
        if (n) {
          const auto* b = bins->GetArray();
          f << "  [[ ";
          for (int i=0; i<n; ++i) {
            if (i) f << ',';
            f << b[i];
          }
          f << " ]]";
          nb[i] = n+1;
        } else {
          int n = a->GetNbins();
          f << "  [[ ["
            << a->GetXmin() << ','
            << a->GetXmax() << ','
            << n
            << "] ]]";
          nb[i] = n+2;
        }
      }
      f << "\n],\n"
           "\"bins\":[\n";
      const bool errs = h->GetSumw2N();
      for (bool first=true;;) {
        if (first) first = false;
        else f << ",\n";
        if (errs) {
          f << '[' << h->GetBinContent(b[0],b[1],b[2])
            << ',' << h->GetBinError  (b[0],b[1],b[2]) << ']';
        } else {
          f << h->GetBinContent(b[0],b[1],b[2]);
        }
        for (int i=na; ; ) { --i;
          if (++b[i] < nb[i]) break;
          b[i] = 0;
          if (!i) goto bins_done;
        }
      }
bins_done: ;
      f << "\n]"
           "\n}";
    } else {
      cout << "\033[37m" << name << "\033[0m" << endl;
    }
  }
}

int main(int argc, char* argv[]) {
  if (argc!=2 && argc!=3) {
    cout << "usage: " << argv[0] << " input.root [output_dir]\n";
    return 1;
  }

  TFile file(argv[1]);
  if (file.IsZombie()) return 1;

  traverse(&file, argc<3
    ? fs::path(file.GetName()).stem()
    : argv[2]);
}
